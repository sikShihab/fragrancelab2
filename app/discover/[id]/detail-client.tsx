"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchPriceRecords } from "@/lib/catalog";
import { getSupabase } from "@/lib/supabase-browser";
import { toggleId } from "@/lib/collection-client";
import { useCollectionIds } from "@/lib/use-collection";
import type { Fragrance, PriceRecord } from "@/lib/types";
import { FragranceImage } from "@/app/components/FragranceImage";
import { resolveFragranceImage, showDevBadge } from "@/lib/fragrance-images";

export default function FragranceDetail({ initial }: { initial: Fragrance }) {
  const f = initial;
  const [prices, setPrices] = useState<PriceRecord[]>([]);
  const { owned, wanted } = useCollectionIds();

  useEffect(() => {
    fetchPriceRecords(getSupabase(), f.id).then(setPrices);
  }, [f.id]);

  const isOwned = owned.includes(f.id);
  const isWanted = wanted.includes(f.id);

  return (
    <section className="page-shell">
      <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr]">
        <div className="sticky top-28 self-start">
          <div className="product-image detail-image">
            <FragranceImage fragrance={f} variant="detail" alt={`${f.brandName} ${f.name}`} />
            {resolveFragranceImage(f, "detail")?.isDevelopmentReference && showDevBadge() ? <span className="photo-status">DEV REFERENCE</span> : null}
          </div>
          {resolveFragranceImage(f, "detail")?.isDevelopmentReference ? <p className="mt-3 text-[11px] text-ink/55">Photo via Fragrantica dataset (reference only)</p> : null}
        </div>
        <div>
          <div className="brand-lockup">{f.brandLogoUrl ? <img src={f.brandLogoUrl} alt="" /> : <span>{f.brandName}</span>}</div>
          <h1 className="display-md mt-3">{f.name}</h1>
          <p className="mt-4 text-sm text-ink/50">
            {f.concentration} · {f.gender}
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            {f.mainAccords.map((a) => (
              <span className="tag" key={a}>
                {a}
              </span>
            ))}
          </div>

          <div className="mt-7 flex flex-wrap gap-2">
            <button onClick={() => toggleId("owned", f.id)} className={isOwned ? "primary-btn" : "secondary-btn"}>
              {isOwned ? "✓ In your collection" : "Add to Collection"}
            </button>
            <button onClick={() => toggleId("wanted", f.id)} className={isWanted ? "primary-btn" : "secondary-btn"}>
              {isWanted ? "♡ On your wishlist" : "Want to Buy"}
            </button>
            <Link href={`/compare?a=${f.canonicalId}`} className="secondary-btn">
              Compare
            </Link>
            <Link href="/ask" className="secondary-btn">
              Ask FragranceLab
            </Link>
          </div>

          <div className="mt-9 grid gap-3 sm:grid-cols-3">
            <div className="soft-card p-5">
              <p className="eyebrow">Rating</p>
              <p className="mt-2 font-display text-3xl">{f.rating ? f.rating.toFixed(1) : "—"}</p>
            </div>
            <div className="soft-card p-5">
              <p className="eyebrow">Longevity</p>
              <p className="mt-2 text-sm">{f.longevity || "Pending"}</p>
            </div>
            <div className="soft-card p-5">
              <p className="eyebrow">Sillage</p>
              <p className="mt-2 text-sm">{f.sillage || "Pending"}</p>
            </div>
          </div>
          <div className="mt-8 rounded-[28px] bg-ink p-7 text-bg">
            <p className="eyebrow text-bg/40">Scent profile</p>
            <div className="mt-5 grid gap-6 sm:grid-cols-3">
              <div>
                <p className="text-xs text-bg/40">Top</p>
                <p className="mt-2 text-sm">{f.notesTop.length ? f.notesTop.join(" · ") : "Data pending"}</p>
              </div>
              <div>
                <p className="text-xs text-bg/40">Heart</p>
                <p className="mt-2 text-sm">{f.notesMiddle.length ? f.notesMiddle.join(" · ") : "Data pending"}</p>
              </div>
              <div>
                <p className="text-xs text-bg/40">Base</p>
                <p className="mt-2 text-sm">{f.notesBase.length ? f.notesBase.join(" · ") : "Data pending"}</p>
              </div>
            </div>
          </div>
          <div className="mt-8">
            <h2 className="font-display text-3xl">Observed prices</h2>
            <div className="mt-4 divide-y divide-ink/10 rounded-[24px] border border-ink/10 bg-white">
              {prices.length ? (
                prices.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-5">
                    <div>
                      <p className="font-medium">{p.retailerName}</p>
                      <p className="mt-1 text-xs text-ink/55">
                        {p.country} · {p.bottleSizeMl}ml
                      </p>
                    </div>
                    <p className="font-display text-2xl">
                      {p.currency} {p.price.toLocaleString()}
                    </p>
                  </div>
                ))
              ) : (
                <div className="p-7 text-sm text-ink/60">No verified price records yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
