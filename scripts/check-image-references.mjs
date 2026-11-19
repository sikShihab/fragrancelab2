#!/usr/bin/env node
// Checks remote image pointers without downloading or storing image files.
// Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/check-image-references.mjs --limit 500
import { createClient } from "@supabase/supabase-js";

const limitArg = process.argv.find((arg) => arg.startsWith("--limit"));
const limit = Math.min(Math.max(Number(limitArg?.split("=")[1] || 500), 1), 5000);
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
const supabase = createClient(url, key, { auth: { persistSession: false } });

async function check(sourceUrl) {
  if (!sourceUrl) return { ok: false, error: "No source URL" };
  try {
    const response = await fetch(sourceUrl, { method: "HEAD", signal: AbortSignal.timeout(8000), redirect: "follow" });
    return response.ok ? { ok: true } : { ok: false, hard: response.status === 404 || response.status === 410, error: `HTTP ${response.status}` };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message.slice(0, 300) : "Request failed" }; }
}

const { data: images, error } = await supabase.from("fragrance_images").select("id, source_url, thumbnail_url, license_status").order("last_checked", { ascending: true, nullsFirst: true }).limit(limit);
if (error) throw error;
let available = 0;
for (const image of images || []) {
  const result = await check(image.source_url || image.thumbnail_url);
  if (result.ok) available++;
  const update = { last_checked: new Date().toISOString(), availability_status: result.ok ? "available" : result.hard ? "unavailable" : "unknown", last_error: result.ok ? null : result.error };
  const { error: updateError } = await supabase.from("fragrance_images").update(update).eq("id", image.id);
  if (updateError) throw updateError;
}
console.log(`Checked ${(images || []).length} image references: ${available} available, ${(images || []).length - available} unavailable.`);
