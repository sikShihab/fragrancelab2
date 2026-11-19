"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchFragrances } from "@/lib/catalog";
import { getSupabase } from "@/lib/supabase-browser";
import { useCollectionIds } from "@/lib/use-collection";
import type { Fragrance } from "@/lib/types";

export default function Profile() {
  const [user, setUser] = useState<any>(null);
  const [fragrances, setFragrances] = useState<Fragrance[]>([]);
  const { owned, wanted } = useCollectionIds();

  useEffect(() => {
    setUser(JSON.parse(localStorage.getItem("fl-user") || "null"));
    fetchFragrances(getSupabase()).then(setFragrances);
  }, []);

  if (!user)
    return (
      <section className="center-page">
        <div className="soft-card text-center">
          <p className="eyebrow">Private area</p>
          <h1 className="display-md">
            Your shelf starts
            <br />
            <span>with you.</span>
          </h1>
          <Link href="/login" className="primary-btn mt-7 inline-flex">
            Log in / Create account ↗
          </Link>
        </div>
      </section>
    );

  const brands = new Set(fragrances.filter((f) => owned.includes(f.id)).map((f) => f.brandName)).size;

  return (
    <section className="page-shell">
      <div className="profile-hero">
        <div className="profile-avatar-lg">{user.name.slice(0, 1).toUpperCase()}</div>
        <div>
          <p className="eyebrow">Profile</p>
          <h1 className="display-md">
            {user.name}'s <span>fragrance world.</span>
          </h1>
          <p className="mt-3 text-sm text-ink/55">{user.email}</p>
        </div>
        <button
          className="secondary-btn ml-auto"
          onClick={async () => {
            const supabase = getSupabase();
            if (supabase) await supabase.auth.signOut();
            localStorage.removeItem("fl-user");
            window.location.href = "/";
          }}
        >
          Log out
        </button>
      </div>
      <div className="stat-grid">
        <div>
          <b>{owned.length}</b>
          <span>Owned</span>
        </div>
        <div>
          <b>{wanted.length}</b>
          <span>Want to buy</span>
        </div>
        <div>
          <b>{brands}</b>
          <span>Brands</span>
        </div>
        <div>
          <b>{fragrances.filter((f) => owned.includes(f.id)).length ? "✓" : "–"}</b>
          <span>Advisor ready</span>
        </div>
      </div>
      <div className="feature-grid">
        <Link href="/collection" className="feature-card">
          <p className="eyebrow">My Collection</p>
          <h2>Your real shelf.</h2>
          <p>See everything you own arranged as a lit display, with notes, ratings and wearing history.</p>
        </Link>
        <Link href="/wishlist" className="feature-card">
          <p className="eyebrow">Want to buy</p>
          <h2>Your next bottles.</h2>
          <p>Save fragrances you are considering and compare them when you're ready to buy.</p>
        </Link>
        <Link href="/ask" className="feature-card dark">
          <p className="eyebrow">Ask FragranceLab</p>
          <h2>Ask from your shelf.</h2>
          <p>"I want something for hot weather under ৳5,000 that doesn't smell like what I own."</p>
        </Link>
      </div>
    </section>
  );
}
