import type { SupabaseClient } from "@supabase/supabase-js";
import type { CatalogPage, CatalogQuery, Fragrance, FragranceImage, PriceRecord, WeightedTerm } from "./types";
import { fragrances as mockFragrances, priceRecords as mockPriceRecords } from "./mock-data";

// Every read here takes the Supabase client explicitly (browser client on
// pages, server client in API routes) rather than importing one directly, so
// this module works the same on both sides and falls back to the bundled
// mock catalog whenever no client is configured (dev without Supabase env
// vars) or a query errors.

function asWeightedList(v: any): WeightedTerm[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => ({ name: x?.name, weight: x?.weight ?? x?.strength ?? null })).filter((x) => x.name);
}

// Highest-weight-first plain name list, for the existing string[] fields
// every current page already renders.
function namesByWeight(v: any, limit = 12): string[] {
  return asWeightedList(v)
    .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))
    .slice(0, limit)
    .map((t) => t.name);
}

function topVoteKeys(v: any, limit = 3): string[] {
  if (!v || typeof v !== "object") return [];
  return Object.entries(v as Record<string, number>)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    .slice(0, limit)
    .map(([k]) => k.replace(/_/g, " "));
}

function mapImageRow(row: any): FragranceImage | undefined {
  if (!row?.provider) return undefined;
  return {
    id: row.id,
    fragranceId: row.fragrance_id,
    sourceUrl: row.source_url ?? undefined,
    thumbnailUrl: row.thumbnail_url ?? undefined,
    provider: row.provider,
    licenseStatus: row.license_status ?? "unknown",
    attribution: row.attribution ?? undefined,
    verified: Boolean(row.verified),
    lastChecked: row.last_checked ?? undefined,
    imageType: row.image_type ?? "bottle",
    priority: row.priority ?? 0,
    availabilityStatus: row.availability_status ?? "unknown",
  };
}

function mapFragranceRow(row: any): Fragrance {
  const notesTop = row.notes_top ?? [];
  const notesMiddle = row.notes_middle ?? [];
  const notesBase = row.notes_base ?? [];
  const notesFlat = row.notes_flat ?? [];
  const hasTiers = notesTop.length || notesMiddle.length || notesBase.length;
  const accords = row.main_accords ?? [];

  return {
    id: row.id,
    brandId: row.brand_id,
    brandName: row.brands?.name ?? row.brand_name ?? "Unknown brand",
    brandLogoUrl: row.brands?.logo_url ?? undefined,
    name: row.name,
    concentration: row.concentration ?? undefined,
    canonicalId: row.canonical_id,
    aliases: row.aliases ?? [],
    gender: row.gender ?? undefined,
    year: row.year ?? undefined,

    notesTop: hasTiers ? namesByWeight(notesTop) : namesByWeight(notesFlat),
    notesMiddle: hasTiers ? namesByWeight(notesMiddle) : [],
    notesBase: hasTiers ? namesByWeight(notesBase) : [],
    mainAccords: namesByWeight(accords, 8),
    notesTopWeighted: asWeightedList(hasTiers ? notesTop : notesFlat),
    notesMiddleWeighted: asWeightedList(notesMiddle),
    notesBaseWeighted: asWeightedList(notesBase),
    mainAccordsWeighted: asWeightedList(accords),

    season: topVoteKeys(row.seasons, 2),
    occasion: topVoteKeys(row.daypart, 2),
    longevity: row.longevity_label ?? undefined,
    sillage: row.sillage_label ?? undefined,

    rating: row.rating_avg ?? undefined,
    ratingCount: row.rating_count ?? row.people_count ?? 0,
    source: row.source ?? "catalog",
    sourceUrl: row.source_url ?? undefined,

    images: (row.fragrance_images ?? []).map(mapImageRow).filter(Boolean) as FragranceImage[],
    lastUpdated: row.last_updated ?? new Date().toISOString(),

    collection: row.collection ?? undefined,
    description: row.description ?? undefined,
    perfumers: (row.fragrance_perfumers ?? []).map((fp: any) => fp.perfumers?.name).filter(Boolean),
    popularityMagnitude: row.popularity_magnitude ?? undefined,
    peopleCount: row.people_count ?? undefined,
    relation: row.relation_have != null || row.relation_had != null || row.relation_want != null
      ? { have: row.relation_have, had: row.relation_had, want: row.relation_want }
      : undefined,
    communityGender: row.community_gender ?? undefined,
    seasonVotes: row.seasons ?? undefined,
    daypartVotes: row.daypart ?? undefined,
    ratingHistogram: row.rating_histogram ?? undefined,
    longevityHistogram: row.longevity_histogram ?? undefined,
    sillageHistogram: row.sillage_histogram ?? undefined,
    priceValueAvg: row.price_value_avg ?? undefined,
    priceValueHistogram: row.price_value_histogram ?? undefined,
    aiPros: (row.ai_pros ?? []).map((p: any) => ({ text: p.text, upVotes: p.up_votes, downVotes: p.down_votes })),
    aiCons: (row.ai_cons ?? []).map((p: any) => ({ text: p.text, upVotes: p.up_votes, downVotes: p.down_votes })),
    externalSource: row.external_provider
      ? {
          provider: row.external_provider,
          id: row.external_id ?? undefined,
          slug: row.external_slug ?? undefined,
          url: row.source_url ?? undefined,
          license: row.license ?? undefined,
        }
      : undefined,
  };
}

function mapPriceRow(row: any): PriceRecord {
  return {
    id: row.id,
    fragranceId: row.fragrance_id,
    retailerName: row.retailer_name,
    country: row.country,
    currency: row.currency,
    price: Number(row.price),
    bottleSizeMl: row.bottle_size_ml ?? undefined,
    url: row.url ?? undefined,
    source: row.source,
    matchConfidence: row.match_confidence ?? undefined,
    lastUpdated: row.last_updated,
  };
}

// Image metadata is a separate relation. This join lets the image service
// choose a provider without putting provider URLs in the catalog model.
const FRAGRANCE_SELECT = "*, brands(name, logo_url), fragrance_images(*)";
// Lists and cards never need histograms, descriptions or pros/cons. Selecting
// only these keeps rows small (important on the free database tier).
const CARD_SELECT = "id, brand_id, name, concentration, canonical_id, aliases, gender, year, notes_top, notes_middle, notes_base, notes_flat, main_accords, seasons, daypart, longevity_label, sillage_label, rating_avg, rating_count, people_count, popularity_magnitude, source, last_updated, brands(name, logo_url), fragrance_images(id, fragrance_id, source_url, thumbnail_url, provider, license_status, attribution, verified, last_checked, image_type, priority, availability_status)";

export async function fetchFragrances(client: SupabaseClient | null): Promise<Fragrance[]> {
  if (!client) return mockFragrances;
  const { data, error } = await client.from("fragrances").select(CARD_SELECT).order("popularity_magnitude", { ascending: false, nullsFirst: false }).limit(200);
  if (error || !data) return process.env.NODE_ENV === "production" ? [] : mockFragrances;
  return data.map(mapFragranceRow);
}

function filterMockCatalog({ query = "", filter = "" }: CatalogQuery): Fragrance[] {
  const terms = `${query} ${filter}`.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return mockFragrances;
  return mockFragrances.filter((f) => {
    const haystack = [f.brandName, f.name, ...f.aliases, ...f.notesTop, ...f.notesMiddle, ...f.notesBase, ...f.mainAccords, ...f.season, ...f.occasion].join(" ").toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

// Full-catalog reads go through the search_catalog_ids SQL function. It finds
// only page-sized IDs with an indexed search document, then this query fetches
// the corresponding rich catalog/image records. No 140K-row browser fetch.
export async function searchFragrancePage(client: SupabaseClient | null, query: CatalogQuery = {}): Promise<CatalogPage> {
  const pageSize = Math.min(Math.max(Number(query.pageSize) || 24, 1), 60);
  const page = Math.max(Number(query.page) || 1, 1);
  if (!client) {
    const all = filterMockCatalog(query);
    return { items: all.slice((page - 1) * pageSize, page * pageSize), total: all.length, page, pageSize };
  }

  const { data: matches, error } = await client.rpc("search_catalog_ids", {
    p_query: query.query?.trim() || null,
    p_filter: query.filter?.trim() || null,
    p_limit: pageSize,
    p_offset: (page - 1) * pageSize,
  });
  if (error || !matches) return { items: [], total: 0, page, pageSize };
  const ids = matches.map((row: any) => row.fragrance_id).filter(Boolean);
  if (!ids.length) return { items: [], total: Number(matches[0]?.total_count ?? 0), page, pageSize };
  const { data, error: detailsError } = await client.from("fragrances").select(CARD_SELECT).in("id", ids);
  if (detailsError || !data) return { items: [], total: Number(matches[0]?.total_count ?? 0), page, pageSize };
  const rowsById = new Map(data.map((row: any) => [row.id, mapFragranceRow(row)]));
  return {
    items: ids.map((id: string) => rowsById.get(id)).filter(Boolean) as Fragrance[],
    total: Number(matches[0]?.total_count ?? 0),
    page,
    pageSize,
  };
}

export async function fetchFragrancesByIds(client: SupabaseClient | null, ids: string[]): Promise<Fragrance[]> {
  if (!ids.length) return [];
  if (!client) return mockFragrances.filter((f) => ids.includes(f.id));
  const { data, error } = await client.from("fragrances").select(CARD_SELECT).in("id", ids);
  if (error || !data) return [];
  const rowsById = new Map(data.map(mapFragranceRow).map((f) => [f.id, f]));
  return ids.map((id) => rowsById.get(id)).filter(Boolean) as Fragrance[];
}

export async function fetchFragranceByCanonicalId(client: SupabaseClient | null, canonicalId: string): Promise<Fragrance | undefined> {
  if (!client) return mockFragrances.find((f) => f.canonicalId === canonicalId || f.id === canonicalId);
  const { data, error } = await client.from("fragrances").select(FRAGRANCE_SELECT).eq("canonical_id", canonicalId).maybeSingle();
  if (error || !data) return undefined;
  return mapFragranceRow(data);
}

export async function fetchPriceRecords(client: SupabaseClient | null, fragranceId: string): Promise<PriceRecord[]> {
  if (!client) return mockPriceRecords.filter((p) => p.fragranceId === fragranceId);
  const { data, error } = await client.from("price_records").select("*").eq("fragrance_id", fragranceId);
  if (error || !data) return [];
  return data.map(mapPriceRow);
}

// Deal Lab needs a price lookup for every fragrance at once — fetch all
// records in one query rather than one round trip per row.
export async function fetchAllPriceRecords(client: SupabaseClient | null): Promise<PriceRecord[]> {
  if (!client) return mockPriceRecords;
  const { data, error } = await client.from("price_records").select("*");
  if (error || !data) return [];
  return data.map(mapPriceRow);
}
