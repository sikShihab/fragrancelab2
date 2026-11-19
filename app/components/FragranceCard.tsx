"use client";
import Link from "next/link";
import { Fragrance } from "@/lib/types";
import { toggleId } from "@/lib/collection-client";
import { FragranceImage } from "./FragranceImage";
import { resolveFragranceImage, showDevBadge } from "@/lib/fragrance-images";

export function FragranceCard({ fragrance, owned = false, wanted = false }: { fragrance: Fragrance; owned?: boolean; wanted?: boolean }) {
  return (
    <article className="fragrance-card group">
      <Link href={`/discover/${fragrance.canonicalId}`} className="block">
        <div className="product-image">
          {showDevBadge() && resolveFragranceImage(fragrance, "card")?.isDevelopmentReference ? <div className="photo-status">DEV REFERENCE</div> : null}
          <FragranceImage fragrance={fragrance} variant="card" alt={`${fragrance.brandName} ${fragrance.name}`} />
          <span className="concentration">{fragrance.concentration || "EDP"}</span>
          {fragrance.rating ? <span className="rating">★ {fragrance.rating.toFixed(1)}</span> : null}
        </div>
        <div className="p-5">
          <div className="brand-lockup">
            {fragrance.brandLogoUrl ? <img src={fragrance.brandLogoUrl} alt="" /> : <span>{fragrance.brandName}</span>}
          </div>
          <h3 className="mt-1 font-display text-xl font-semibold tracking-[-.03em]">{fragrance.name}</h3>
          <p className="mt-2 text-sm text-ink/50">
            {[...fragrance.notesTop, ...fragrance.notesMiddle, ...fragrance.notesBase].slice(0, 4).join(" · ") ||
              fragrance.mainAccords.slice(0, 3).join(" · ")}
          </p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {fragrance.mainAccords.slice(0, 3).map((a) => (
              <span key={a} className="tag">
                {a}
              </span>
            ))}
          </div>
        </div>
      </Link>
      <div className="card-actions">
        <button onClick={() => toggleId("owned", fragrance.id)} className={owned ? "active" : ""}>
          {owned ? "✓ Owned" : "+ Add to shelf"}
        </button>
        <button onClick={() => toggleId("wanted", fragrance.id)} className={wanted ? "active" : ""}>
          {wanted ? "♡ Wanting it" : "＋ Want to buy"}
        </button>
      </div>
    </article>
  );
}
