import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

// Only for reading public data (fragrances, brands, price_records) from server
// routes/components. Those tables have "public catalog read" / "public price
// read" RLS policies, so the anon key is sufficient — no user session needed.
// Never use this client for user-owned tables (collection_items, wishlist_items,
// profiles); those must go through the browser client with the user's session
// so RLS can enforce auth.uid() = user_id.
export function getSupabaseServer(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (!client) client = createClient(url, key);
  return client;
}
