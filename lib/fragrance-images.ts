import type { Fragrance, FragranceImage } from "./types";

export type ImageMode = "development" | "dataset" | "commercial";
export type ImageVariant = "card" | "detail" | "shelf";

export interface ResolvedFragranceImage {
  url: string;
  fallbackUrl?: string;
  provider: string;
  licenseStatus: FragranceImage["licenseStatus"];
  attribution?: string;
  isDevelopmentReference: boolean;
}

// This is the only provider policy boundary. Add a licensed provider here
// later; catalog records and React components stay unchanged.
interface ImageProvider {
  canDisplay(image: FragranceImage, mode: ImageMode): boolean;
  resolve(image: FragranceImage, variant: ImageVariant): ResolvedFragranceImage | undefined;
}

const datasetReferenceProvider: ImageProvider = {
  canDisplay: (image, mode) => mode !== "commercial" && image.licenseStatus === "development_reference" && image.availabilityStatus !== "unavailable",
  resolve: (image, variant) => {
    const useThumbnail = variant === "card" || variant === "shelf";
    const url = (useThumbnail ? image.thumbnailUrl : image.sourceUrl) || image.sourceUrl || image.thumbnailUrl;
    if (!url) return undefined;
    const fallbackUrl = url === image.sourceUrl ? image.thumbnailUrl : image.sourceUrl;
    return { url, fallbackUrl, provider: image.provider, licenseStatus: image.licenseStatus, attribution: image.attribution, isDevelopmentReference: true };
  },
};

const authorizedProvider: ImageProvider = {
  canDisplay: (image) => image.availabilityStatus !== "unavailable" && image.verified && ["licensed", "authorized", "owned"].includes(image.licenseStatus),
  resolve: (image, variant) => {
    const useThumbnail = variant === "card" || variant === "shelf";
    const url = (useThumbnail ? image.thumbnailUrl : image.sourceUrl) || image.sourceUrl || image.thumbnailUrl;
    if (!url) return undefined;
    return { url, fallbackUrl: url === image.sourceUrl ? image.thumbnailUrl : image.sourceUrl, provider: image.provider, licenseStatus: image.licenseStatus, attribution: image.attribution, isDevelopmentReference: false };
  },
};

const providers: Record<string, ImageProvider> = {
  fragrantica_dataset_reference: datasetReferenceProvider,
  licensed_catalog: authorizedProvider,
  official_brand: authorizedProvider,
  authorized_provider: authorizedProvider,
  owned: authorizedProvider,
};

// development: show dataset photos with a DEV badge (local work).
// dataset:     show dataset photos publicly with a credit line. Non-commercial sites only.
// anything else (default): hide dataset photos; only licensed/owned images show.
export function imageMode(): ImageMode {
  const m = process.env.NEXT_PUBLIC_FRAGRANCELAB_IMAGE_MODE;
  return m === "development" || m === "dataset" ? m : "commercial";
}
export const showDevBadge = () => imageMode() === "development";

export function resolveFragranceImage(fragrance: Pick<Fragrance, "images">, variant: ImageVariant): ResolvedFragranceImage | undefined {
  const mode = imageMode();
  const candidates = [...(fragrance.images ?? [])]
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
    .filter((image) => image.imageType === "bottle" || image.imageType === "packshot" || image.imageType === "thumbnail");

  for (const image of candidates) {
    // New licensed providers can be added as data immediately; specialized
    // adapters are optional only when they need custom URL/signing behavior.
    const provider = providers[image.provider] ?? (image.licenseStatus === "development_reference" ? undefined : authorizedProvider);
    if (provider?.canDisplay(image, mode)) {
      const resolved = provider.resolve(image, variant);
      if (resolved) return resolved;
    }
  }
  return undefined;
}
