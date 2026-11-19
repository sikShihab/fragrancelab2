#!/usr/bin/env node
// Creates in-app deal-alert events from observed retailer prices. This does
// not send external messages; connect an email/push provider to these events.
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
const supabase = createClient(url, key, { auth: { persistSession: false } });
const { data: alerts, error: alertsError } = await supabase.from("deal_alerts").select("id, fragrance_id, country, target_price").eq("enabled", true);
if (alertsError) throw alertsError;
const ids = [...new Set((alerts || []).map((alert) => alert.fragrance_id))];
if (!ids.length) { console.log("No enabled deal alerts."); process.exit(0); }
const { data: prices, error: pricesError } = await supabase.from("price_records").select("id, fragrance_id, country, price").in("fragrance_id", ids);
if (pricesError) throw pricesError;
const events = (alerts || []).flatMap((alert) => (prices || []).filter((price) => price.fragrance_id === alert.fragrance_id && price.country === alert.country && Number(price.price) <= Number(alert.target_price)).map((price) => ({ deal_alert_id: alert.id, price_record_id: price.id, observed_price: price.price })));
if (events.length) {
  const { error } = await supabase.from("deal_alert_events").upsert(events, { onConflict: "deal_alert_id,price_record_id", ignoreDuplicates: true });
  if (error) throw error;
}
console.log(`Evaluated ${(alerts || []).length} alerts and recorded ${events.length} qualifying price events.`);
