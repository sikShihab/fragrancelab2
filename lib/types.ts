export type PriceSource = "scraped" | "serp_api" | "ai_checked";
export type DealState = "available" | "not_listed_elsewhere" | "pending";

export interface Brand { id:string; name:string; aliases:string[]; countryOfOrigin?:string; website?:string; logoUrl?:string; }

// A weighted note/accord — the encyclopedia-scale import (see
// scripts/import-fragrantica.mjs) preserves note prominence and accord
// strength rather than flattening straight to a name list.
export interface WeightedTerm { name:string; weight?:number|null; }

// Images deliberately live independently from the fragrance metadata.  A
// provider can be replaced (or an asset can be re-licensed) without changing
// the catalog record or any UI component.
export type ImageLicenseStatus = "development_reference" | "licensed" | "authorized" | "owned" | "unknown" | "unavailable";
export type FragranceImageType = "bottle" | "packshot" | "thumbnail" | "editorial";
export interface FragranceImage {
  id?: string;
  fragranceId: string;
  sourceUrl?: string;
  thumbnailUrl?: string;
  provider: string;
  licenseStatus: ImageLicenseStatus;
  attribution?: string;
  verified: boolean;
  lastChecked?: string;
  imageType: FragranceImageType;
  priority?: number;
  availabilityStatus?: "available" | "unavailable" | "unknown";
}

export interface Fragrance {
  id:string; brandId:string; brandName:string; brandLogoUrl?:string; name:string; concentration?:string;
  canonicalId:string; aliases:string[]; gender?:string; year?:number;
  // Plain name lists — existing UI reads these unchanged. Sourced either
  // directly (mock/simple data) or flattened from the weighted jsonb columns
  // (Supabase catalog), sorted by weight/strength where known.
  notesTop:string[]; notesMiddle:string[]; notesBase:string[]; mainAccords:string[];
  // Weighted versions, when the backend has them, for any UI that wants to
  // show prominence rather than just a list.
  notesTopWeighted?:WeightedTerm[]; notesMiddleWeighted?:WeightedTerm[]; notesBaseWeighted?:WeightedTerm[];
  mainAccordsWeighted?:WeightedTerm[];
  season:string[]; occasion:string[]; longevity?:string; sillage?:string;
  rating?:number; ratingCount:number; source:string; sourceUrl?:string;
  // Resolved only by lib/fragrance-images.ts / FragranceImage. Components
  // must not couple catalog rendering to a provider URL.
  images?: FragranceImage[];
  lastUpdated:string;

  // Encyclopedia extras — optional, populated only when the backend has them
  // (Supabase catalog imported via scripts/import-fragrantica.mjs). No page
  // currently reads these; they're here for UI that adopts them later.
  collection?:string; description?:string; perfumers?:string[];
  popularityMagnitude?:number; peopleCount?:number;
  relation?:{ have?:number|null; had?:number|null; want?:number|null };
  communityGender?:Record<string,number>;
  seasonVotes?:Record<string,number>; daypartVotes?:Record<string,number>;
  ratingHistogram?:{bucket:number; count:number}[];
  longevityHistogram?:{bucket:number; count:number}[];
  sillageHistogram?:{bucket:number; count:number}[];
  priceValueAvg?:number; priceValueHistogram?:{bucket:number; count:number}[];
  aiPros?:{text:string; upVotes?:number; downVotes?:number}[];
  aiCons?:{text:string; upVotes?:number; downVotes?:number}[];
  // Catalog provenance — distinct from the image-source provenance stored in
  // fragrance_images. Neither is itself a product-photo URL.
  externalSource?:{ provider?:string; id?:number; slug?:string; url?:string; license?:string };
}
export interface CatalogQuery { query?: string; filter?: string; page?: number; pageSize?: number; }
export interface CatalogPage { items: Fragrance[]; total: number; page: number; pageSize: number; }
export interface PriceRecord { id:string; fragranceId:string; retailerName:string; country:string; currency:string; price:number; bottleSizeMl?:number; url?:string; source:PriceSource; matchConfidence?:number; lastUpdated:string; }
export interface DealStatus { fragranceId:string; country:string; state:DealState; lastChecked?:string; }
export interface CollectionItem { id:string; userId:string; fragranceId:string; rating?:number; notes?:string; dateAcquired?:string; lastWorn?:string; }
export type DealVerdict = "Below typical price"|"Lowest currently observed"|"Lowest found"|"Limited price data"|"No matching international listing"|"No listing found in the checked markets";
