#!/usr/bin/env node
// Imports the Fragrantica-derived Kaggle dump (perfumes.jsonl) into Supabase.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//     node scripts/import-fragrantica.mjs /path/to/perfumes.jsonl [--limit 2000] [--batch-size 500]
//
// Requires the SERVICE ROLE key, not the anon key: the catalog tables have
// no insert/update RLS policy for anon/authenticated roles by design (see
// supabase/schema.sql), so bulk ingestion has to bypass RLS. Never expose
// the service role key to a browser bundle or commit it anywhere.
//
// IMPORTANT — LICENSING: the source dataset is CC BY-NC-SA 4.0
// (non-commercial, share-alike). Every row this script writes is tagged
// license='CC BY-NC-SA 4.0 — dev/testing only, not cleared for commercial
// redistribution or as verified product photography' and
// Dataset image URLs are stored in the independent fragrance_images relation
// as development references. The UI's image service may display those remote
// URLs in development only; it never represents them as licensed product
// photography. Do not download them or enable this provider commercially.

import { createClient } from "@supabase/supabase-js";
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";

const args = process.argv.slice(2);
const filePath = args.find((a) => !a.startsWith("--")) || new URL("../../perfumes.jsonl", import.meta.url).pathname;
const limitArg = args.find((a) => a.startsWith("--limit"));
const LIMIT = limitArg ? Number(limitArg.split("=")[1] || args[args.indexOf(limitArg) + 1]) : Infinity;
const batchArg = args.find((a) => a.startsWith("--batch-size"));
const BATCH_SIZE = batchArg ? Number(batchArg.split("=")[1] || args[args.indexOf(batchArg) + 1]) : 500;

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (service role, not anon) before running this.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const LICENSE = "CC BY-NC-SA 4.0 — dev/testing only, not cleared for commercial redistribution or as verified product photography";

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const CONCENTRATION_PATTERNS = [
  [/extrait de parfum/i, "Extrait de Parfum"],
  [/parfum(?!e)/i, "Parfum"],
  [/eau de parfum|\bedp\b/i, "EDP"],
  [/eau de toilette|\bedt\b/i, "EDT"],
  [/eau fraiche/i, "Eau Fraiche"],
  [/eau de cologne|\bedc\b/i, "EDC"],
  [/cologne/i, "Cologne"],
];
function parseConcentration(name, description) {
  const hay = `${name} ${description || ""}`;
  for (const [re, label] of CONCENTRATION_PATTERNS) if (re.test(hay)) return label;
  return null;
}

function longevityLabel(avg) {
  if (avg == null) return null;
  if (avg < 1.8) return "Weak";
  if (avg < 2.8) return "Moderate";
  if (avg < 3.8) return "Long lasting";
  return "Very long lasting";
}
function sillageLabel(avg) {
  if (avg == null) return null;
  if (avg < 1.8) return "Intimate";
  if (avg < 2.6) return "Moderate";
  if (avg < 3.4) return "Strong";
  return "Enormous";
}

function notesJson(list) {
  return (list || []).map((n) => ({ name: n.name, weight: n.weight ?? null }));
}
function accordsJson(list) {
  return (list || []).map((a) => ({ name: a.name, strength: a.strength ?? null }));
}

function sourceUrl(value) {
  if (typeof value !== "string") return null;
  // Kaggle exports sometimes wrap URL values as Markdown links.
  const candidate = value.match(/\]\((https?:\/\/[^\s)]+)\)/)?.[1] || value.match(/https?:\/\/[^\s\])]+/)?.[0];
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

const seenSlugs = new Set();
function canonicalIdFor(brand, name, externalId) {
  const base = slugify(`${brand} ${name}`);
  if (!seenSlugs.has(base)) {
    seenSlugs.add(base);
    return base;
  }
  const disambiguated = `${base}-${externalId}`;
  seenSlugs.add(disambiguated);
  return disambiguated;
}

function transform(record) {
  const brandName = record.brand || "Unknown";
  const description = record.description || null;
  return {
    _brandName: brandName,
    _perfumers: record.perfumers || [],
    _similar: record.similar || { reminds_me_of: [], also_liked: [] },
    _image: {
      source_url: sourceUrl(record.picture),
      thumbnail_url: sourceUrl(record.thumbnail),
      provider: "fragrantica_dataset_reference",
      license_status: "development_reference",
      attribution: "Fragrantica-derived development dataset; development/reference use only",
      verified: false,
      last_checked: new Date().toISOString(),
      image_type: "bottle",
      priority: 0,
    },
    row: {
      name: record.name,
      canonical_id: canonicalIdFor(brandName, record.name, record.id),
      aliases: [record.name],
      concentration: parseConcentration(record.name, description),
      gender: record.gender || null,
      year: record.year ?? null,
      collection: record.collection || null,
      description,
      notes_top: notesJson(record.notes?.tiered?.top),
      notes_middle: notesJson(record.notes?.tiered?.middle),
      notes_base: notesJson(record.notes?.tiered?.base),
      notes_flat: notesJson(record.notes?.flat),
      main_accords: accordsJson(record.accords),
      rating_avg: record.rating?.average ?? null,
      rating_count: record.people ?? 0,
      rating_histogram: record.rating?.histogram ?? [],
      longevity_avg: record.longevity?.average ?? null,
      longevity_label: longevityLabel(record.longevity?.average),
      longevity_histogram: record.longevity?.histogram ?? [],
      sillage_avg: record.sillage?.average ?? null,
      sillage_label: sillageLabel(record.sillage?.average),
      sillage_histogram: record.sillage?.histogram ?? [],
      price_value_avg: record.price_value?.average ?? null,
      price_value_histogram: record.price_value?.histogram ?? [],
      relation_have: record.relation?.have ?? null,
      relation_had: record.relation?.had ?? null,
      relation_want: record.relation?.want ?? null,
      community_gender: record.community_gender ?? {},
      seasons: record.seasons ?? {},
      daypart: record.daypart ?? {},
      people_count: record.people ?? null,
      popularity_magnitude: record.popularity?.magnitude ?? null,
      ai_pros: record.ai_summary?.pros ?? [],
      ai_cons: record.ai_summary?.cons ?? [],
      image_url: null,
      image_source: null,
      external_image_url: null,
      source: "fragrantica_dev_dataset",
      source_url: record.url || null,
      external_provider: "fragrantica",
      external_id: record.id,
      external_slug: record.slug,
      license: LICENSE,
    },
  };
}

async function upsertBrands(names) {
  const unique = [...new Set(names)];
  if (!unique.length) return new Map();
  const { data, error } = await supabase
    .from("brands")
    .upsert(unique.map((name) => ({ name })), { onConflict: "name", ignoreDuplicates: true })
    .select("id, name");
  if (error) throw error;
  // ignoreDuplicates rows aren't returned, so re-select to get a complete map
  const { data: all, error: err2 } = await supabase.from("brands").select("id, name").in("name", unique);
  if (err2) throw err2;
  return new Map((all || data || []).map((b) => [b.name, b.id]));
}

async function upsertPerfumers(perfumerLists) {
  const names = [...new Set(perfumerLists.flat().map((p) => p.name).filter(Boolean))];
  if (!names.length) return new Map();
  const { error } = await supabase
    .from("perfumers")
    .upsert(names.map((name) => ({ name })), { onConflict: "name", ignoreDuplicates: true });
  if (error) throw error;
  const { data: all, error: err2 } = await supabase.from("perfumers").select("id, name").in("name", names);
  if (err2) throw err2;
  return new Map((all || []).map((p) => [p.name, p.id]));
}

async function processBatch(batch) {
  const transformed = batch.map(transform);
  const brandMap = await upsertBrands(transformed.map((t) => t._brandName));
  const perfumerMap = await upsertPerfumers(transformed.map((t) => t._perfumers));

  const fragranceRows = transformed.map((t) => ({ ...t.row, brand_id: brandMap.get(t._brandName) }));
  const { data: insertedFragrances, error } = await supabase
    .from("fragrances")
    .upsert(fragranceRows, { onConflict: "canonical_id", ignoreDuplicates: true })
    .select("id, canonical_id, external_id");
  if (error) throw error;

  // ignoreDuplicates means rows that already existed aren't returned — fetch
  // the full set for this batch so junction tables still get fragrance ids.
  const canonicalIds = fragranceRows.map((r) => r.canonical_id);
  const { data: allFragrances, error: err2 } = await supabase
    .from("fragrances")
    .select("id, canonical_id, external_id")
    .in("canonical_id", canonicalIds);
  if (err2) throw err2;
  const byCanonical = new Map(allFragrances.map((f) => [f.canonical_id, f.id]));

  const junctionRows = [];
  const similarRows = [];
  const imageRows = [];
  for (const t of transformed) {
    const fragranceId = byCanonical.get(t.row.canonical_id);
    if (!fragranceId) continue;
    if (t._image.source_url || t._image.thumbnail_url) imageRows.push({ fragrance_id: fragranceId, ...t._image });
    for (const p of t._perfumers) {
      const perfumerId = perfumerMap.get(p.name);
      if (perfumerId) junctionRows.push({ fragrance_id: fragranceId, perfumer_id: perfumerId });
    }
    for (const s of t._similar.reminds_me_of || []) {
      similarRows.push({ fragrance_id: fragranceId, similar_external_id: s.id, similar_slug: s.slug, kind: "reminds_me_of", up_votes: s.up_votes ?? null, down_votes: s.down_votes ?? null });
    }
    for (const s of t._similar.also_liked || []) {
      similarRows.push({ fragrance_id: fragranceId, similar_external_id: s.id, similar_slug: s.slug, kind: "also_liked", up_votes: s.up_votes ?? null, down_votes: s.down_votes ?? null });
    }
  }

  if (junctionRows.length) {
    const { error: e3 } = await supabase.from("fragrance_perfumers").upsert(junctionRows, { onConflict: "fragrance_id,perfumer_id", ignoreDuplicates: true });
    if (e3) throw e3;
  }
  if (similarRows.length) {
    const { error: e4 } = await supabase.from("fragrance_similar").upsert(similarRows, { onConflict: "fragrance_id,similar_external_id,kind", ignoreDuplicates: true });
    if (e4) throw e4;
  }
  if (imageRows.length) {
    const { error: e5 } = await supabase
      .from("fragrance_images")
      .upsert(imageRows, { onConflict: "fragrance_id,provider" });
    if (e5) throw e5;
  }

  return fragranceRows.length;
}

async function main() {
  console.log(`Importing from ${filePath}`);
  console.log(`Limit: ${LIMIT === Infinity ? "none (full 140K+ dataset)" : LIMIT}, batch size: ${BATCH_SIZE}`);
  console.log(`Every row will be tagged: source=fragrantica_dev_dataset, license="${LICENSE}"`);

  const rl = createInterface({ input: createReadStream(filePath, { encoding: "utf8" }), crlfDelay: Infinity });

  let batch = [];
  let total = 0;
  let imported = 0;
  let failed = 0;
  const start = Date.now();

  for await (const line of rl) {
    if (!line.trim()) continue;
    if (total >= LIMIT) break;
    let record;
    try {
      record = JSON.parse(line);
    } catch {
      failed++;
      continue;
    }
    if (!record.name || !record.brand) {
      failed++;
      continue;
    }
    batch.push(record);
    total++;

    if (batch.length >= BATCH_SIZE) {
      try {
        imported += await processBatch(batch);
      } catch (e) {
        console.error(`Batch failed at record ${total}:`, e.message || e);
        failed += batch.length;
      }
      const elapsed = ((Date.now() - start) / 1000).toFixed(0);
      console.log(`  ${total} read, ${imported} upserted, ${failed} skipped (${elapsed}s elapsed)`);
      batch = [];
    }
  }
  if (batch.length) {
    try {
      imported += await processBatch(batch);
    } catch (e) {
      console.error("Final batch failed:", e.message || e);
      failed += batch.length;
    }
  }

  console.log(`\nDone. ${total} records read, ${imported} upserted, ${failed} skipped.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
