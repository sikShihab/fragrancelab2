#!/usr/bin/env node
// Adds licensed/authorized image pointers without changing fragrance metadata.
// CSV columns: canonical_id,source_url,thumbnail_url,provider,license_status,attribution,verified,priority
// Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/import-authorized-images.mjs images.csv
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const filePath = process.argv[2];
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!filePath || !url || !key) throw new Error("Provide a CSV path and set SUPABASE_URL plus SUPABASE_SERVICE_ROLE_KEY.");
const supabase = createClient(url, key, { auth: { persistSession: false } });
function rows(source) { const [head, ...lines] = source.trim().split(/\r?\n/); const headers = head.split(",").map((value) => value.trim()); return lines.map((line) => { const values = line.match(/(?:[^,"]+|"(?:[^"]|"")*")+/g)?.map((value) => value.replace(/^"|"$/g, "").replace(/""/g, '"').trim()) || []; return Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])); }); }
const input = rows(await readFile(filePath, "utf8")).filter((row) => row.canonical_id && (row.source_url || row.thumbnail_url));
const { data: fragrances, error } = await supabase.from("fragrances").select("id, canonical_id").in("canonical_id", [...new Set(input.map((row) => row.canonical_id))]);
if (error) throw error;
const idByCanonical = new Map((fragrances || []).map((fragrance) => [fragrance.canonical_id, fragrance.id]));
const images = input.flatMap((row) => { const fragranceId = idByCanonical.get(row.canonical_id); if (!fragranceId) return []; const licenseStatus = row.license_status || "licensed"; if (!["licensed", "authorized", "owned"].includes(licenseStatus)) throw new Error(`Row ${row.canonical_id} must be licensed, authorized, or owned.`); return [{ fragrance_id: fragranceId, source_url: row.source_url || null, thumbnail_url: row.thumbnail_url || null, provider: row.provider || "licensed_catalog", license_status: licenseStatus, attribution: row.attribution || null, verified: row.verified !== "false", last_checked: new Date().toISOString(), image_type: "bottle", priority: Number(row.priority) || 100, availability_status: "unknown", last_error: null }]; });
if (images.length) { const { error: upsertError } = await supabase.from("fragrance_images").upsert(images, { onConflict: "fragrance_id,provider" }); if (upsertError) throw upsertError; }
console.log(`Imported ${images.length} authorized image records.`);
