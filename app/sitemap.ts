import type { MetadataRoute } from "next";
import { fragrances as mock } from "@/lib/mock-data";
import { getSupabaseServer } from "@/lib/supabase-server";
import { siteUrl } from "@/lib/site";

export const revalidate = 86400;

// Top 5,000 by popularity. Sitemaps allow 50,000 URLs; raise the limit (or use
// generateSitemaps) once the full catalog is live and indexed.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const pages = ["", "/discover", "/compare", "/deal-lab"].map((p) => ({ url: `${base}${p}` }));
  const client = getSupabaseServer();
  let ids: string[] = mock.map((f) => f.canonicalId);
  if (client) {
    const { data } = await client.from("fragrances").select("canonical_id").order("popularity_magnitude", { ascending: false, nullsFirst: false }).limit(5000);
    if (data) ids = data.map((r: any) => r.canonical_id);
  }
  return [...pages, ...ids.map((id) => ({ url: `${base}/discover/${id}` }))];
}
