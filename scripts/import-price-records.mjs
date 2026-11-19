#!/usr/bin/env node
// Imports retailer observations without scraping at runtime.
// CSV columns: canonical_id,retailer_name,country,currency,price,bottle_size_ml,url,source,match_confidence,observed_at
// Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/import-price-records.mjs prices.csv
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const filePath = process.argv[2];
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!filePath || !url || !key) throw new Error("Provide a CSV path and set SUPABASE_URL plus SUPABASE_SERVICE_ROLE_KEY.");
const supabase = createClient(url, key, { auth: { persistSession: false } });

function csvRows(source) {
  const lines = source.trim().split(/\r?\n/); const headers = lines.shift()?.split(",").map((value) => value.trim()) || [];
  return lines.map((line) => { const values = line.match(/(?:[^,"]+|"(?:[^"]|"")*")+/g)?.map((value) => value.replace(/^"|"$/g, "").replace(/""/g, '"').trim()) || []; return Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])); });
}
const rows = csvRows(await readFile(filePath, "utf8")).filter((row) => row.canonical_id && row.retailer_name && row.country && row.currency && Number(row.price) > 0);
const canonicalIds = [...new Set(rows.map((row) => row.canonical_id))];
const { data: fragrances, error: fragranceError } = await supabase.from("fragrances").select("id, canonical_id").in("canonical_id", canonicalIds);
if (fragranceError) throw fragranceError;
const idByCanonical = new Map((fragrances || []).map((fragrance) => [fragrance.canonical_id, fragrance.id]));
const records = rows.flatMap((row) => {
  const fragranceId = idByCanonical.get(row.canonical_id); if (!fragranceId) return [];
  const source = row.source || "scraped";
  const sourceKey = `${source}:${row.canonical_id}:${row.retailer_name}:${row.country}:${row.bottle_size_ml || ""}:${row.url || ""}`;
  return [{ fragrance_id: fragranceId, retailer_name: row.retailer_name, country: row.country, currency: row.currency, price: Number(row.price), bottle_size_ml: Number(row.bottle_size_ml) || null, url: row.url || null, source, match_confidence: Number(row.match_confidence) || null, observed_at: row.observed_at || new Date().toISOString(), last_updated: new Date().toISOString(), source_key: sourceKey }];
});
if (records.length) { const { error } = await supabase.from("price_records").upsert(records, { onConflict: "source_key" }); if (error) throw error; }
console.log(`Imported ${records.length} price observations (${rows.length - records.length} rows had no matching fragrance).`);
