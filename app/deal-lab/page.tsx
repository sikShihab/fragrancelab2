"use client";
import { useEffect, useState } from "react";
import { fetchFragrances, fetchAllPriceRecords } from "@/lib/catalog";
import { getSupabase } from "@/lib/supabase-browser";
import type { Fragrance, PriceRecord } from "@/lib/types";

export default function DealLabPage() {
  const [fragrances, setFragrances] = useState<Fragrance[]>([]);
  const [priceRecords, setPriceRecords] = useState<PriceRecord[]>([]);

  useEffect(() => {
    const supabase = getSupabase();
    fetchFragrances(supabase).then(setFragrances);
    fetchAllPriceRecords(supabase).then(setPriceRecords);
  }, []);

  return (
    <section className="mx-auto max-w-[1240px] px-5 py-14 sm:px-8 lg:px-10 lg:py-20">
      <div className="max-w-3xl">
        <p className="text-[10px] font-semibold uppercase tracking-[.24em] text-ink/55">Deal Lab</p>
        <h1 className="mt-3 font-display text-5xl font-semibold tracking-[-.04em] sm:text-6xl">
          Don't chase discounts.
          <br />
          <span className="text-champagne-ink">Chase real deals.</span>
        </h1>
        <p className="mt-6 text-base leading-7 text-ink/55">Compare observed prices by market, retailer and bottle size. The UI distinguishes checked listings from missing data.</p>
      </div>
      <div className="mt-12 overflow-hidden rounded-[30px] border border-ink/10 bg-white">
        <div className="grid grid-cols-[1.4fr_.7fr_.7fr_.7fr] border-b border-ink/10 bg-ink px-5 py-4 text-[10px] uppercase tracking-[.16em] text-bg/45">
          <span>Fragrance</span>
          <span>Bangladesh</span>
          <span>Global</span>
          <span>Signal</span>
        </div>
        {fragrances.filter((f) => priceRecords.some((p) => p.fragranceId === f.id)).map((f) => {
          const rows = priceRecords.filter((p) => p.fragranceId === f.id);
          const cheapest = (list: PriceRecord[]) => [...list].sort((a, b) => a.price - b.price)[0];
          const bd = cheapest(rows.filter((p) => p.country === "Bangladesh"));
          const intl = cheapest(rows.filter((p) => p.country !== "Bangladesh"));
          return (
            <div key={f.id} className="grid grid-cols-[1.4fr_.7fr_.7fr_.7fr] items-center border-b border-ink/[.08] px-5 py-5 text-sm last:border-0">
              <div>
                <p className="font-semibold">{f.name}</p>
                <p className="mt-1 text-xs text-ink/55">
                  {f.brandName} · {bd?.bottleSizeMl ?? 100}ml
                </p>
              </div>
              <span>{bd ? `${bd.currency} ${bd.price.toLocaleString()}` : "—"}</span>
              <span>{intl ? `${intl.currency} ${intl.price.toLocaleString()} · ${intl.country}` : "No listing"}</span>
              <span className="text-xs font-semibold text-champagne-ink">{bd && intl ? "Both markets" : bd ? "BD only" : intl ? "Abroad only" : "No data"}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
