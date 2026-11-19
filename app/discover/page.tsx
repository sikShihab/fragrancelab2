"use client";
import { useEffect, useState } from "react";
import { FragranceCard } from "@/app/components/FragranceCard";
import { fetchCatalogPage } from "@/lib/catalog-client";
import { useCollectionIds } from "@/lib/use-collection";
import type { Fragrance } from "@/lib/types";

const filters = ["All", "Sweet", "Fresh", "Vanilla", "Woody", "Oud", "Coffee", "Amber", "Citrus"];

export default function DiscoverPage() {
  const [fragrances, setFragrances] = useState<Fragrance[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const { owned, wanted } = useCollectionIds();

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      fetchCatalogPage({ query, filter, page, pageSize: 24 }, controller.signal)
        .then((result) => { setFragrances(result.items); setTotal(result.total); })
        .catch((error) => { if (error.name !== "AbortError") { setFragrances([]); setTotal(0); } })
        .finally(() => setLoading(false));
    }, query ? 180 : 0);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [query, filter, page]);

  const totalPages = Math.max(1, Math.ceil(total / 24));
  const setCatalogFilter = (value: string) => { setFilter(value); setPage(1); };
  const setCatalogQuery = (value: string) => { setQuery(value); setPage(1); };

  return (
    <section className="mx-auto max-w-[1240px] px-5 py-14 sm:px-8 lg:px-10 lg:py-20">
      <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[.24em] text-ink/55">Fragrance catalog</p>
          <h1 className="mt-3 font-display text-5xl font-semibold tracking-[-.04em] sm:text-6xl">
            Find what
            <br />
            <span className="text-ink/60">smells like you.</span>
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-6 text-ink/50">
            Search the catalog by fragrance, brand, note, accord or vibe. The interface is built to grow from the seed catalog into the full FragranceLab database.
          </p>
        </div>
        <div>
          <label className="sr-only" htmlFor="search">
            Search fragrances
          </label>
          <div className="rounded-2xl border border-ink/10 bg-white/70 px-5 py-4 shadow-sm">
            <input
              id="search"
              value={query}
              onChange={(e) => setCatalogQuery(e.target.value)}
              className="w-full bg-transparent text-sm outline-none placeholder:text-ink/55"
              placeholder="Search a fragrance, note, brand or vibe"
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {filters.map((x) => (
              <button
                key={x}
                onClick={() => setCatalogFilter(x)}
                className={`rounded-full border px-3 py-1.5 text-xs transition ${filter === x ? "border-ink bg-ink text-bg" : "border-ink/10 hover:border-ink/25"}`}
              >
                {x}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-10 flex items-center justify-between border-b border-ink/10 pb-4">
        <p className="text-xs text-ink/60">{loading ? "Searching catalog…" : `${total >= 1000 ? "1,000+" : total.toLocaleString()} fragrances found`}</p>
        <p className="text-[10px] uppercase tracking-[.18em] text-ink/55">Catalog-first experience</p>
      </div>
      <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {fragrances.map((f) => (
          <FragranceCard key={f.id} fragrance={f} owned={owned.includes(f.id)} wanted={wanted.includes(f.id)} />
        ))}
      </div>
      {!loading && !fragrances.length && (
        <div className="rounded-[28px] border border-dashed border-ink/15 p-16 text-center">
          <p className="font-display text-3xl">Nothing matched that search.</p>
          <p className="mt-2 text-sm text-ink/60">Try a brand, note, accord or fragrance name.</p>
        </div>
      )}
      {totalPages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-3">
          <button className="secondary-btn" disabled={page === 1 || loading} onClick={() => setPage((current) => current - 1)}>Previous</button>
          <span className="text-xs text-ink/60">Page {page} of {totalPages}</span>
          <button className="secondary-btn" disabled={page === totalPages || loading} onClick={() => setPage((current) => current + 1)}>Next</button>
        </div>
      )}
    </section>
  );
}
