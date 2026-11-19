"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { fetchFragrances } from "@/lib/catalog";
import { getSupabase } from "@/lib/supabase-browser";
import type { Fragrance } from "@/lib/types";
import { FragranceImage } from "@/app/components/FragranceImage";

function CompareInner() {
  const [fragrances, setFragrances] = useState<Fragrance[]>([]);
  const [ids, setIds] = useState<[string, string]>(["", ""]);

  const pre = useSearchParams().get("a");
  useEffect(() => {
    fetchFragrances(getSupabase()).then((list) => {
      setFragrances(list);
      const first = list.find((f) => f.id === pre || f.canonicalId === pre) ?? list[0];
      const second = list.find((f) => f.id !== first?.id);
      setIds([first?.id ?? "", second?.id ?? ""]);
    });
  }, [pre]);

  const items = ids.map((id) => fragrances.find((f) => f.id === id)).filter(Boolean) as Fragrance[];
  const setAt = (id: string, i: number) => setIds((a) => (i === 0 ? [id, a[1]] : [a[0], id]));

  return (
    <section className="page-shell">
      <p className="eyebrow">Compare</p>
      <h1 className="display-md mt-3">
        Put two bottles
        <br />
        <span>under the same light.</span>
      </h1>
      <div className="compare-selectors">
        {[0, 1].map((i) => (
          <select key={i} value={ids[i]} onChange={(e) => setAt(e.target.value, i)}>
            {fragrances.map((f) => (
              <option key={f.id} value={f.id}>
                {f.brandName} — {f.name}
              </option>
            ))}
          </select>
        ))}
      </div>
      <div className="compare-grid">
        {items.map((f) => (
          <div className="compare-card" key={f.id}>
            <div className="product-image">
              <FragranceImage fragrance={f} variant="detail" alt={`${f.brandName} ${f.name}`} />
            </div>
            <div className="p-7">
              <div className="brand-lockup">{f.brandLogoUrl ? <img src={f.brandLogoUrl} alt="" /> : <span>{f.brandName}</span>}</div>
              <h2 className="font-display text-3xl mt-2">{f.name}</h2>
              <div className="compare-data">
                <div>
                  <small>Accords</small>
                  <b>{f.mainAccords.join(" · ")}</b>
                </div>
                <div>
                  <small>Performance</small>
                  <b>
                    {f.longevity || "Pending"} · {f.sillage || "Pending"}
                  </b>
                </div>
                <div>
                  <small>Notes</small>
                  <b>{[...f.notesTop, ...f.notesMiddle, ...f.notesBase].join(" · ") || "Data pending"}</b>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function ComparePage() {
  return <Suspense fallback={null}><CompareInner /></Suspense>;
}
