"use client";
import { useEffect, useState } from "react";

const KEY = "fl-settings";
export default function Settings() {
  const [hot, setHot] = useState(true);
  const [country, setCountry] = useState("Bangladesh");
  const [context, setContext] = useState(true);
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || "{}");
      if (typeof s.hot === "boolean") setHot(s.hot);
      if (typeof s.country === "string") setCountry(s.country);
      if (typeof s.context === "boolean") setContext(s.context);
    } catch {}
  }, []);
  const save = (next: { hot: boolean; country: string; context: boolean }) => localStorage.setItem(KEY, JSON.stringify(next));
  return (
    <section className="page-shell narrow">
      <p className="eyebrow">Settings</p>
      <h1 className="display-md">Make FragranceLab <span>yours.</span></h1>
      <div className="settings-card">
        <label htmlFor="market">Market</label>
        <select id="market" value={country} onChange={(e) => { setCountry(e.target.value); save({ hot, country: e.target.value, context }); }}>
          <option>Bangladesh</option><option>United Kingdom</option><option>United States</option><option>United Arab Emirates</option>
        </select>
        <label className="toggle-row"><span><b>Deal alerts</b><small>Notify me when saved fragrances hit my target market price.</small></span>
          <input type="checkbox" checked={hot} onChange={(e) => { setHot(e.target.checked); save({ hot: e.target.checked, country, context }); }} /></label>
        <label className="toggle-row"><span><b>Recommendation context</b><small>Use my collection and want-to-buy list when Ask FragranceLab recommends.</small></span>
          <input type="checkbox" checked={context} onChange={(e) => { setContext(e.target.checked); save({ hot, country, context: e.target.checked }); }} /></label>
      </div>
    </section>
  );
}
