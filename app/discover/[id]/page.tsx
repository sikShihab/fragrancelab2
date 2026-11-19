import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchFragranceByCanonicalId } from "@/lib/catalog";
import { getSupabaseServer } from "@/lib/supabase-server";
import FragranceDetail from "./detail-client";

export const revalidate = 600;
type Props = { params: Promise<{ id: string }> };
const load = cache((id: string) => fetchFragranceByCanonicalId(getSupabaseServer(), id));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const f = await load((await params).id);
  if (!f) return { title: "Fragrance not found", robots: { index: false } };
  const notes = [...f.notesTop, ...f.notesMiddle, ...f.notesBase].slice(0, 6).join(", ");
  const description = [`${f.brandName} ${f.name}`, f.concentration, f.mainAccords.slice(0, 3).join(", "), notes && `Notes: ${notes}`].filter(Boolean).join(" · ");
  return { title: `${f.brandName} ${f.name}`, description, alternates: { canonical: `/discover/${f.canonicalId}` }, openGraph: { title: `${f.brandName} ${f.name}`, description, type: "website" } };
}

export default async function Page({ params }: Props) {
  const f = await load((await params).id);
  if (!f) notFound();
  return <FragranceDetail initial={f} />;
}
