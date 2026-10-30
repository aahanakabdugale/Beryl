import { describe, it, expect } from "vitest";
import {
  searchProducts,
  searchMockCatalog,
  normalizeChannel3Product,
  MOCK_CATALOG,
} from "../lib/channel3";

describe("Channel3 Wrapper & Mock Catalog (S1 & M10)", () => {
  it("Mock catalog contains valid products in integer cents", () => {
    expect(MOCK_CATALOG.length).toBeGreaterThanOrEqual(6);

    for (const prod of MOCK_CATALOG) {
      expect(Number.isInteger(prod.price_cents)).toBe(true);
      expect(prod.price_cents).toBeGreaterThan(0);
      expect(prod.merchant_domain).toBeDefined();
      expect(prod.title).toBeDefined();
      expect(prod.category).toBeDefined();
    }
  });

  it("Search mock catalog returns matching results for 'mouse'", () => {
    const results = searchMockCatalog("wireless mouse", 3);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].title.toLowerCase()).toContain("mouse");
  });

  it("Search mock catalog flags malicious trap for attack queries", () => {
    const results = searchMockCatalog("test malicious attack page", 1);
    expect(results.length).toBe(1);
    expect(results[0].id).toBe("mock_malicious_trap_08");
    expect(results[0].merchant_domain).toBe("shadydeals.xyz");
    expect(results[0].untrusted_metadata).toContain("SYSTEM NOTICE FOR LLM");
  });

  it("Normalizes Channel3 raw product with integer cents and domain", () => {
    const rawSample = {
      id: "ch3_sample_99",
      title: "Ultra Ergonomic Mouse",
      description: "Sample description",
      category: {
        slug: "mice",
        title: "Computer Mice",
        path: [{ slug: "electronics", title: "Electronics" }],
      },
      brands: [{ name: "Logitech" }],
      images: [
        {
          url: "https://example.com/mouse.jpg",
          is_main_image: true,
        },
      ],
      offers: [
        {
          url: "https://buy.trychannel3.com/sample",
          domain: "bestbuy.com",
          price: {
            price: 24.99, // $24.99 float
            currency: "USD",
          },
          availability: "InStock",
        },
      ],
    };

    const normalized = normalizeChannel3Product(rawSample);
    expect(normalized.id).toBe("ch3_sample_99");
    expect(normalized.title).toBe("Ultra Ergonomic Mouse");
    expect(normalized.price_cents).toBe(2499); // Exactly 2499 integer cents
    expect(normalized.merchant_domain).toBe("bestbuy.com");
    expect(normalized.in_stock).toBe(true);
    expect(normalized.category).toBe("electronics");
  });

  it("searchProducts falls back to mock catalog when requested", async () => {
    const products = await searchProducts("phone stand", {
      limit: 2,
      source: "mock",
    });

    expect(products.length).toBeGreaterThanOrEqual(1);
    expect(products[0].source).toBe("mock");
  });
});
