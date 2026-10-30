import { NextRequest, NextResponse } from "next/server";
import { searchProducts } from "@/lib/channel3";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const query = body?.query;

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Query parameter is required" },
        { status: 400 }
      );
    }

    const limit = typeof body.limit === "number" ? body.limit : 5;
    const source = body.source || "auto";

    const products = await searchProducts(query, { limit, source });

    return NextResponse.json({
      query,
      count: products.length,
      products,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to search catalog" },
      { status: 500 }
    );
  }
}
