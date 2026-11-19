"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { fetchFragrancesByIds } from "@/lib/catalog";
import { getSupabase } from "@/lib/supabase-browser";
import { FragranceCard } from "../components/FragranceCard";
import { useCollectionIds } from "@/lib/use-collection";
import type { Fragrance } from "@/lib/types";
import { DealAlertControl } from "@/app/components/DealAlertControl";

export default function Wishlist() {
  const [fragrances, setFragrances] = useState<Fragrance[]>([]);
  const { owned, wanted, loaded } = useCollectionIds();

  useEffect(() => {
    if (wanted.length) fetchFragrancesByIds(getSupabase(), wanted).then(setFragrances);
    else setFragrances([]);
  }, [wanted]);

  const list = useMemo(() => fragrances.filter((f) => wanted.includes(f.id)), [fragrances, wanted]);

  return (
    <section className="page-shell">
      <div className="section-head">
        <div>
          <p className="eyebrow">Want to buy</p>
          <h1 className="display-md">
            Your next <span>bottles.</span>
          </h1>
          <p>Keep a running list of fragrances you are considering.</p>
        </div>
        <Link href="/discover" className="secondary-btn">
          Browse catalog ↗
        </Link>
      </div>
      {list.length ? (
        <div className="card-grid">
          {list.map((f) => (
            <div key={f.id}><FragranceCard fragrance={f} owned={owned.includes(f.id)} wanted /><DealAlertControl fragranceId={f.id} /></div>
          ))}
        </div>
      ) : (
        loaded && (
          <div className="empty-card">
            <h2>Your list is empty.</h2>
            <p>Search the catalog and tap "Want to buy" on any fragrance.</p>
            <Link href="/discover" className="primary-btn mt-5 inline-flex">
              Find a fragrance ↗
            </Link>
          </div>
        )
      )}
    </section>
  );
}
