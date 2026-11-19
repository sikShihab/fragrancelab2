import type { CatalogPage, CatalogQuery } from "./types";

export async function fetchCatalogPage(query: CatalogQuery, signal?: AbortSignal): Promise<CatalogPage> {
  const params = new URLSearchParams();
  if (query.query?.trim()) params.set("q", query.query.trim());
  if (query.filter && query.filter !== "All") params.set("filter", query.filter);
  params.set("page", String(query.page ?? 1));
  params.set("pageSize", String(query.pageSize ?? 24));
  const response = await fetch(`/api/catalog?${params}`, { signal });
  if (!response.ok) throw new Error("Catalog search failed");
  return response.json();
}
