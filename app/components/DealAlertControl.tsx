"use client";

import { useEffect, useState } from "react";
import { getDealAlert, saveDealAlert } from "@/lib/deal-alerts-client";

export function DealAlertControl({ fragranceId }: { fragranceId: string }) {
  const [target, setTarget] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => { getDealAlert(fragranceId).then((alert) => { setTarget(alert ? String(alert.targetPrice) : ""); setEnabled(Boolean(alert?.enabled)); }); }, [fragranceId]);
  async function save() {
    const amount = Number(target); if (!amount) return;
    await saveDealAlert({ fragranceId, country: "Bangladesh", targetPrice: amount, enabled: true });
    setEnabled(true); setSaved(true); window.setTimeout(() => setSaved(false), 1600);
  }
  return <div className="mt-4 flex flex-wrap items-center gap-2"><input aria-label="Bangladesh target price" className="w-36 rounded-full border border-ink/10 bg-white px-3 py-2 text-xs outline-none" inputMode="decimal" value={target} onChange={(event) => setTarget(event.target.value)} placeholder="Target BDT" /><button className="secondary-btn !px-3 !py-2" onClick={save} disabled={!target}>{saved ? "Saved" : enabled ? "Update alert" : "Set deal alert"}</button></div>;
}
