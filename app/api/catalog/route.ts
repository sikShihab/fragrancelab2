import { NextResponse } from "next/server";
import { searchFragrancePage } from "@/lib/catalog";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = await searchFragrancePage(getSupabaseServer(), {
    query: searchParams.get("q") ?? undefined,
    filter: searchParams.get("filter") ?? undefined,
    page: Number(searchParams.get("page") ?? 1),
    pageSize: Number(searchParams.get("pageSize") ?? 24),
  });
  return NextResponse.json(page, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" } });
}
