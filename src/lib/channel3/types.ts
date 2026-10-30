export interface NormalizedProduct {
  id: string;
  title: string;
  description: string;
  category: string;
  category_path: string[];
  merchant: string;
  merchant_domain: string;
  price_cents: number;
  currency: string;
  url: string;
  image_url: string | null;
  in_stock: boolean;
  source: "channel3" | "mock";
  untrusted_metadata?: string;
}

export interface SearchOptions {
  limit?: number;
  source?: "channel3" | "mock" | "auto";
  preferredCategory?: string;
}

export interface Channel3RawProduct {
  id: string;
  title: string;
  description?: string;
  category?: {
    slug?: string;
    title?: string;
    path?: Array<{ slug: string; title: string }>;
  };
  brands?: Array<{ name: string }>;
  images?: Array<{ url: string; is_main_image?: boolean }>;
  offers?: Array<{
    url: string;
    domain: string;
    price?: {
      price: number;
      currency?: string;
    };
    availability?: string;
  }>;
}

export interface Channel3SearchResponse {
  products?: Channel3RawProduct[];
  next_page_token?: string;
}
