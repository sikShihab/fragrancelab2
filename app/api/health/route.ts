import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const client = getSupabaseServer();
  if (!client) return NextResponse.json({ ok: true, database: "not configured (mock catalog)" });
  const { error } = await client.from("brands").select("id").limit(1);
  return NextResponse.json({ ok: !error, database: error ? "unreachable" : "ok" }, { status: error ? 503 : 200 });
}
