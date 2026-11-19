"use client";
import { getSupabase } from "./supabase-browser";

export type ListKind = "owned" | "wanted";

const TABLE: Record<ListKind, string> = { owned: "collection_items", wanted: "wishlist_items" };

// Local fallback keys must be namespaced per user — a bare "fl-owned" key
// previously meant every account signed in on one browser shared the same
// shelf. This reads the *currently logged in* local-auth user (or "guest"
// for anonymous browsing) and scopes storage to them.
function localUserKeySuffix(): string {
  if (typeof window === "undefined") return "guest";
  try {
    const u = JSON.parse(localStorage.getItem("fl-user") || "null");
    return u?.email || "guest";
  } catch {
    return "guest";
  }
}

function localKey(kind: ListKind) {
  return `fl-${kind}:${localUserKeySuffix()}`;
}

function readLocal(kind: ListKind): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(localKey(kind)) || "[]");
  } catch {
    return [];
  }
}

function writeLocal(kind: ListKind, ids: string[]) {
  localStorage.setItem(localKey(kind), JSON.stringify(ids));
  window.dispatchEvent(new Event("fl-collection"));
}

async function supabaseUserId(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

// Returns the fragrance ids in the given list for whichever backend is
// active: Supabase collection_items/wishlist_items (RLS-scoped to the
// signed-in user) when a Supabase session exists, else the local fallback.
export async function getIds(kind: ListKind): Promise<string[]> {
  const supabase = getSupabase();
  const userId = supabase ? await supabaseUserId() : null;
  if (supabase && userId) {
    const { data, error } = await supabase.from(TABLE[kind]).select("fragrance_id").eq("user_id", userId);
    if (!error && data) return data.map((r: any) => r.fragrance_id as string);
  }
  return readLocal(kind);
}

export async function toggleId(kind: ListKind, fragranceId: string): Promise<boolean> {
  const supabase = getSupabase();
  const userId = supabase ? await supabaseUserId() : null;
  if (supabase && userId) {
    const table = TABLE[kind];
    const { data: existing } = await supabase
      .from(table)
      .select("id")
      .eq("user_id", userId)
      .eq("fragrance_id", fragranceId)
      .maybeSingle();
    if (existing) {
      await supabase.from(table).delete().eq("id", existing.id);
      window.dispatchEvent(new Event("fl-collection"));
      return false;
    }
    await supabase.from(table).insert({ user_id: userId, fragrance_id: fragranceId });
    window.dispatchEvent(new Event("fl-collection"));
    return true;
  }
  const ids = readLocal(kind);
  const has = ids.includes(fragranceId);
  const next = has ? ids.filter((x) => x !== fragranceId) : [...ids, fragranceId];
  writeLocal(kind, next);
  return !has;
}
