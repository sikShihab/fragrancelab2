"use client";

import { useState } from "react";
import Link from "next/link";
import { FragranceImage } from "@/app/components/FragranceImage";
import { useCollectionIds } from "@/lib/use-collection";
import type { Fragrance } from "@/lib/types";

interface AdvisorResult { mode: "local" | "ai"; answer: string; recommendations: Fragrance[]; }

export default function Ask() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<AdvisorResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { owned } = useCollectionIds();

  async function ask() {
    if (!question.trim() || loading) return;
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: question, ownedIds: owned }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "The advisor could not answer right now.");
      setResult(payload);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The advisor could not answer right now.");
    } finally { setLoading(false); }
  }

  return <section className="ask-page"><div className="ask-orbit"><div className="orbit-dot one"/><div className="orbit-dot two"/></div><div className="ask-inner">
    <p className="eyebrow">FragranceLab advisor</p><h1 className="display-xl">Ask your <span>shelf.</span></h1>
    <p className="lead">Describe what you want to smell like, where you’ll wear it, what you already own, or what you want to avoid.</p>
    <div className="ask-box"><textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={'“I need something fresh for Dhaka summer, under ৳5,000, and I already own Sauvage.”'} />
      <div className="ask-bottom"><div className="prompt-chips"><button onClick={() => setQuestion("Fresh summer fragrance under ৳5,000")}>Hot weather</button><button onClick={() => setQuestion("Something sweet with vanilla and coffee")}>Sweet / vanilla</button><button onClick={() => setQuestion("Something different from what I already own")}>Fill a gap</button></div><button className="primary-btn" onClick={ask} disabled={!question.trim() || loading}>{loading ? "Thinking…" : "Ask ↗"}</button></div>
    </div>
    {error ? <p className="mt-4 text-center text-sm text-red-300">{error}</p> : null}
    {result ? <div className="ask-result"><p className="eyebrow">{result.mode === "ai" ? "FragranceLab says" : "Catalog advisor"}</p><p className="result-copy">{result.answer}</p><div className="mini-results">{result.recommendations.map((f) => <Link key={f.id} href={`/discover/${f.canonicalId}`}><FragranceImage fragrance={f} variant="card" alt={`${f.brandName} ${f.name}`} placeholderClassName="mini-photo-placeholder"/><span><small>{f.brandName}</small><b>{f.name}</b></span></Link>)}</div></div> : null}
    <p className="ask-note">Recommendations use the paginated live catalog and exclude bottles on your shelf. Configure an AI provider to add conversational explanations.</p>
  </div></section>;
}
