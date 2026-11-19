"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchFragrances } from "@/lib/catalog";
import { getSupabase } from "@/lib/supabase-browser";
import { FragranceCard } from "./components/FragranceCard";
import { useCollectionIds } from "@/lib/use-collection";
import type { Fragrance } from "@/lib/types";

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [fragrances, setFragrances] = useState<Fragrance[]>([]);
  const { owned, wanted } = useCollectionIds();

  useEffect(() => {
    const s = () => setUser(JSON.parse(localStorage.getItem("fl-user") || "null"));
    s();
    window.addEventListener("fl-auth", s);
    fetchFragrances(getSupabase()).then(setFragrances);
    return () => window.removeEventListener("fl-auth", s);
  }, []);

  return (
    <>
      <section className="home-dashboard">
        <div className="page-shell">
          <div className="dashboard-top">
            <div>
              <p className="eyebrow">{user ? `Welcome back, ${user.name}` : "Fragrance intelligence platform"}</p>
              <h1 className="display-lg">
                {user ? (
                  <>
                    Your scent world.
                    <br />
                    <span>All in one place.</span>
                  </>
                ) : (
                  <>
                    Know your scent.
                    <br />
                    <span>Know your deal.</span>
                  </>
                )}
              </h1>
              <p className="lead home-lead">Discover real fragrances, build the shelf you actually own, keep a list of what you want next, and ask FragranceLab to connect the dots.</p>
              <div className="home-actions">
                <Link href="/discover" className="primary-btn">
                  Explore the catalog ↗
                </Link>
                {user ? (
                  <Link href="/collection" className="secondary-btn">
                    Open my shelf
                  </Link>
                ) : (
                  <Link href="/login" className="secondary-btn">
                    Create my profile
                  </Link>
                )}
              </div>
            </div>
            <div className="dashboard-visual">
              <div className="visual-ring r1" />
              <div className="visual-ring r2" />
              <div className="visual-label">
                <span>CATALOG</span>
                <b>{fragrances.length}+</b>
                <small>
                  seeded records
                  <br />
                  ready for live ingestion
                </small>
              </div>
            </div>
          </div>
          <div className="quick-grid">
            <Link href="/discover">
              <small>01</small>
              <b>Find a fragrance</b>
              <span>Search by name, brand, note, accord or vibe.</span>
            </Link>
            <Link href="/collection">
              <small>02</small>
              <b>Build your shelf</b>
              <span>Track what you own, wear, rate and want next.</span>
            </Link>
            <Link href="/ask">
              <small>03</small>
              <b>Ask FragranceLab</b>
              <span>Recommendations grounded in your collection context.</span>
            </Link>
            <Link href="/deal-lab">
              <small>04</small>
              <b>Find the real deal</b>
              <span>Compare bottle size, market and retailer price.</span>
            </Link>
          </div>
        </div>
      </section>
      <section className="catalog-preview">
        <div className="page-shell">
          <div className="section-head">
            <div>
              <p className="eyebrow">Catalog</p>
              <h2 className="display-md">
                Start with the
                <br />
                <span>fragrances you know.</span>
              </h2>
            </div>
            <Link href="/discover" className="secondary-btn">
              View all {fragrances.length}+ →
            </Link>
          </div>
          <div className="card-grid">
            {fragrances.slice(0, 6).map((f) => (
              <FragranceCard key={f.id} fragrance={f} owned={owned.includes(f.id)} wanted={wanted.includes(f.id)} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
