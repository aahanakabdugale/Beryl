import {
  NormalizedProduct,
  SearchOptions,
  Channel3RawProduct,
  Channel3SearchResponse,
} from "./types";
import { MOCK_CATALOG } from "./mock-catalog";

interface CacheEntry {
  products: NormalizedProduct[];
  timestamp: number;
}

const SEARCH_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getCacheKey(query: string, limit: number): string {
  return `${query.trim().toLowerCase()}_${limit}`;
}

export function normalizeChannel3Product(
  raw: Channel3RawProduct
): NormalizedProduct {
  const offer = raw.offers?.[0];
  const domain = offer?.domain || "trychannel3.com";
  const brandName = raw.brands?.[0]?.name;

  // Extract clean merchant name from domain or brand
  let merchant = brandName || domain.replace(/^www\./, "").replace(/\.[a-z]+$/, "");
  merchant = merchant.charAt(0).toUpperCase() + merchant.slice(1);

  // Convert float price ($13.99) to integer cents (1399)
  const priceDollars = offer?.price?.price ?? 19.99;
  const price_cents = Math.round(priceDollars * 100);

  // Normalize category
  const categorySlug =
    raw.category?.path?.[0]?.slug ||
    raw.category?.slug ||
    "electronics";

  const categoryPath =
    raw.category?.path?.map((p) => p.slug) || [categorySlug];

  const mainImage =
    raw.images?.find((img) => img.is_main_image)?.url ||
    raw.images?.[0]?.url ||
    null;

  const inStock = offer?.availability
    ? offer.availability.toLowerCase().includes("instock")
    : true;

  return {
    id: raw.id,
    title: raw.title,
    description: raw.description || "",
    category: categorySlug,
    category_path: categoryPath,
    merchant,
    merchant_domain: domain,
    price_cents,
    currency: offer?.price?.currency || "USD",
    url: offer?.url || `https://buy.trychannel3.com/${raw.id}`,
    image_url: mainImage,
    in_stock: inStock,
    source: "channel3",
  };
}

export function searchMockCatalog(
  query: string,
  limit: number = 5
): NormalizedProduct[] {
  const q = query.toLowerCase().trim();

  // If query is broad, return featured catalog items immediately
  if (
    !q ||
    q === "all" ||
    q === "featured" ||
    q === "products" ||
    q === "items" ||
    q === "catalog" ||
    q === "list"
  ) {
    return MOCK_CATALOG.filter((p) => p.id !== "mock_malicious_trap_08").slice(
      0,
      limit
    );
  }

  // If query specifically asks for attack, malicious, or promo cables
  if (
    q.includes("malicious") ||
    q.includes("attack") ||
    q.includes("promo") ||
    q.includes("discount cable") ||
    q.includes("shady")
  ) {
    const maliciousItem = MOCK_CATALOG.find(
      (p) => p.id === "mock_malicious_trap_08"
    );
    if (maliciousItem) {
      return [maliciousItem];
    }
  }

  // General keyword matching against title, description, category, and merchant
  const terms = q.split(/\s+/).filter(Boolean);

  const scored = MOCK_CATALOG.map((product) => {
    let score = 0;
    const fullText =
      `${product.title} ${product.description} ${product.category} ${product.merchant} ${product.merchant_domain}`.toLowerCase();

    for (const term of terms) {
      if (product.title.toLowerCase().includes(term)) score += 3;
      if (product.category.toLowerCase().includes(term)) score += 2;
      if (fullText.includes(term)) score += 1;
    }

    return { product, score };
  });

  const filtered = scored
    .filter((item) => terms.length === 0 || item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.product);

  // If nothing matched, fallback to all non-malicious items
  const results =
    filtered.length > 0
      ? filtered
      : MOCK_CATALOG.filter((p) => p.id !== "mock_malicious_trap_08");

  return results.slice(0, limit);
}

/**
 * Searches Channel3 for products, normalized into BERYL's product format.
 * Features in-memory caching and automatic fallback to mock catalog on network/quota errors.
 */
export async function searchProducts(
  query: string,
  options: SearchOptions = {}
): Promise<NormalizedProduct[]> {
  const limit = options.limit || 5;
  const sourcePreference = options.source || "auto";

  // If explicitly requested mock, bypass external network
  if (sourcePreference === "mock") {
    return searchMockCatalog(query, limit);
  }

  // Check if query is targeting the malicious attack lab test
  const qLower = query.toLowerCase();
  if (
    qLower.includes("malicious") ||
    qLower.includes("attack lab") ||
    qLower.includes("promo cable")
  ) {
    return searchMockCatalog(query, limit);
  }

  // Check cache
  const cacheKey = getCacheKey(query, limit);
  const cached = SEARCH_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.products;
  }

  const apiKey = process.env.CHANNEL3_API_KEY;
  if (!apiKey) {
    console.warn("⚠️ CHANNEL3_API_KEY missing, using mock catalog fallback");
    return searchMockCatalog(query, limit);
  }

  try {
    const response = await fetch("https://api.trychannel3.com/v1/search", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, limit }),
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      console.warn(
        `⚠️ Channel3 API responded with ${response.status}. Falling back to mock catalog.`
      );
      return searchMockCatalog(query, limit);
    }

    const data: Channel3SearchResponse = await response.json();
    const rawProducts = data.products || [];

    if (rawProducts.length === 0) {
      // If Channel3 has no results for this query, fall back to mock items
      return searchMockCatalog(query, limit);
    }

    const normalized = rawProducts.map(normalizeChannel3Product);

    // Save to cache
    SEARCH_CACHE.set(cacheKey, {
      products: normalized,
      timestamp: Date.now(),
    });

    return normalized;
  } catch (error: any) {
    console.warn(
      `⚠️ Channel3 search error (${error.message}). Falling back to mock catalog.`
    );
    return searchMockCatalog(query, limit);
  }
}
