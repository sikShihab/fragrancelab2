"use client";

import { useEffect, useState } from "react";
import { resolveFragranceImage, type ImageVariant } from "@/lib/fragrance-images";
import type { Fragrance } from "@/lib/types";

export function FragranceImage({ fragrance, variant, alt, className, placeholderClassName = "photo-placeholder" }: {
  fragrance: Fragrance;
  variant: ImageVariant;
  alt: string;
  className?: string;
  placeholderClassName?: string;
}) {
  const image = resolveFragranceImage(fragrance, variant);
  const [src, setSrc] = useState(image?.url);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setSrc(image?.url);
    setFailed(false);
  }, [image?.url]);

  // No photo is a normal state, not an error: show the name set in type.
  if (!src || failed) {
    return (
      <div className={placeholderClassName} role="img" aria-label={alt}>
        <span className="ph-brand">{fragrance.brandName}</span>
        <span className="ph-name">{fragrance.name}</span>
      </div>
    );
  }

  return <img className={className} src={src} alt={alt} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => {
    if (image?.fallbackUrl && src !== image.fallbackUrl) setSrc(image.fallbackUrl);
    else setFailed(true);
  }} />;
}
