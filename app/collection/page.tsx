"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { fetchFragrancesByIds } from "@/lib/catalog";
import { getSupabase } from "@/lib/supabase-browser";
import { useCollectionIds } from "@/lib/use-collection";
import type { Fragrance } from "@/lib/types";
import { FragranceImage } from "@/app/components/FragranceImage";

export default function CollectionPage() {
  const [fragrances, setFragrances] = useState<Fragrance[]>([]);
  const { owned: ids, loaded } = useCollectionIds();

  useEffect(() => {
    if (ids.length) fetchFragrancesByIds(getSupabase(), ids).then(setFragrances);
    else setFragrances([]);
  }, [ids]);

  const owned = useMemo(() => fragrances.filter((f) => ids.includes(f.id)), [fragrances, ids]);
  const accords = owned.flatMap((f) => f.mainAccords);
  const warm = accords.filter((a) => ["sweet", "amber", "vanilla", "warm spicy", "coffee"].includes(a)).length;
  const cool = accords.filter((a) => ["fresh", "citrus", "aromatic", "aquatic"].includes(a)).length;

  return (
    <section className="collection-page">
      <div className="page-shell">
        <div className="section-head">
          <div>
            <p className="eyebrow">My Collection</p>
            <h1 className="display-md">
              Your shelf.
              <br />
              <span>Your rules.</span>
            </h1>
            <p>
              {owned.length} fragrances tracked · {warm >= cool ? "warm / evening leaning" : "fresh / daytime leaning"}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/discover" className="secondary-btn">
              + Add fragrance
            </Link>
            <Link href="/ask" className="primary-btn">
              Ask my shelf ↗
            </Link>
          </div>
        </div>
      </div>
      <div className="shelf-room">
        <div className="room-glow" />
        <div className="shelf-header">
          <span>FRAGRANCELAB PRIVATE SHELF</span>
          <span>
            {owned.length} bottles
          </span>
        </div>
        <div className="shelf-unit">
          <div className="shelf-top-light" />
          {Array.from({ length: Math.max(3, Math.ceil(owned.length / 4)) }, (_, row) => row).map((row) => (
            <div className="shelf-row" key={row}>
              <div className="shelf-light" />
              <div className="shelf-bottles">
                {owned.slice(row * 4, row * 4 + 4).map((f) => (
                  <Link href={`/discover/${f.canonicalId}`} key={f.id} className="shelf-bottle">
                    <div className="bottle-photo">
                      <FragranceImage fragrance={f} variant="shelf" alt={`${f.brandName} ${f.name}`} placeholderClassName="photo-placeholder small" />
                    </div>
                    <div className="bottle-label">
                      <small>{f.brandName}</small>
                      <b>{f.name}</b>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="wood-edge" />
            </div>
          ))}
        </div>
        {loaded && owned.length === 0 && (
          <div className="empty-shelf">
            <p>Your shelf is empty.</p>
            <Link href="/discover" className="primary-btn">
              Find your first bottle ↗
            </Link>
          </div>
        )}
      </div>
      <div className="page-shell">
        <div className="collection-insight">
          <div>
            <p className="eyebrow">Collection intelligence</p>
            <h2>{warm >= cool ? "Your shelf leans warm, sweet and evening-ready." : "Your shelf has a fresh, daytime profile."}</h2>
            <p>FragranceLab uses what you actually own — not a generic taste profile — when it suggests what to try next.</p>
          </div>
          <Link href="/ask" className="primary-btn">
            Ask what I'm missing ↗
          </Link>
        </div>
      </div>
    </section>
  );
}
