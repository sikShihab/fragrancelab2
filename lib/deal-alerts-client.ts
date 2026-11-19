"use client";

import { getSupabase } from "./supabase-browser";

export interface DealAlert { id?: string; fragranceId: string; country: string; targetPrice: number; enabled: boolean; }

function localKey() { return "fl-deal-alerts"; }
function readLocal(): DealAlert[] { try { return JSON.parse(localStorage.getItem(localKey()) || "[]"); } catch { return []; } }
function writeLocal(alerts: DealAlert[]) { localStorage.setItem(localKey(), JSON.stringify(alerts)); }

async function userId() { const supabase = getSupabase(); if (!supabase) return null; const { data } = await supabase.auth.getUser(); return data.user?.id ?? null; }

export async function getDealAlert(fragranceId: string, country = "Bangladesh"): Promise<DealAlert | undefined> {
  const supabase = getSupabase(); const uid = await userId();
  if (supabase && uid) {
    const { data } = await supabase.from("deal_alerts").select("id, fragrance_id, country, target_price, enabled").eq("user_id", uid).eq("fragrance_id", fragranceId).eq("country", country).maybeSingle();
    return data ? { id: data.id, fragranceId: data.fragrance_id, country: data.country, targetPrice: Number(data.target_price), enabled: data.enabled } : undefined;
  }
  return readLocal().find((alert) => alert.fragranceId === fragranceId && alert.country === country);
}

export async function saveDealAlert(alert: DealAlert): Promise<DealAlert> {
  const supabase = getSupabase(); const uid = await userId();
  if (supabase && uid) {
    const { data, error } = await supabase.from("deal_alerts").upsert({ user_id: uid, fragrance_id: alert.fragranceId, country: alert.country, target_price: alert.targetPrice, enabled: alert.enabled }, { onConflict: "user_id,fragrance_id,country" }).select("id").single();
    if (error) throw error;
    return { ...alert, id: data.id };
  }
  const rest = readLocal().filter((item) => item.fragranceId !== alert.fragranceId || item.country !== alert.country);
  writeLocal([...rest, alert]);
  return alert;
}
