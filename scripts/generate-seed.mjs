// Generates supabase/seed.sql from the same catalog data that lib/mock-data.ts
// uses for the local fallback, so a fresh Supabase project ends up with an
// equivalent starting catalog. Run with: node scripts/generate-seed.mjs
import { writeFileSync } from "node:fs";

const base = [
  { brandName: "French Avenue", name: "Liquid Brun", canonicalId: "french-avenue-liquid-brun", concentration: "EDP", gender: "Unisex", notesTop: ["Orange Blossom", "Cardamom"], notesMiddle: ["Praline", "Cinnamon"], notesBase: ["Vanilla", "Tonka Bean"], mainAccords: ["sweet", "warm spicy", "vanilla"], season: ["Winter", "Fall"], occasion: ["Date Night", "Evening"], longevity: "Long lasting", sillage: "Moderate", rating: 4.3, ratingCount: 812 },
  { brandName: "Lattafa", name: "Khamrah Qahwa", canonicalId: "lattafa-khamrah-qahwa", concentration: "EDP", gender: "Unisex", notesTop: ["Coffee", "Cinnamon"], notesMiddle: ["Dates", "Saffron"], notesBase: ["Amber", "Musk"], mainAccords: ["warm spicy", "coffee", "sweet"], season: ["Winter"], occasion: ["Evening"], longevity: "Very long lasting", sillage: "Heavy", rating: 4.6, ratingCount: 2140 },
  { brandName: "Armaf", name: "Club de Nuit Intense Man", canonicalId: "armaf-club-de-nuit-intense-man", concentration: "EDT", gender: "Men", notesTop: ["Pineapple", "Blackcurrant"], notesMiddle: ["Birch", "Jasmine"], notesBase: ["Musk", "Ambergris"], mainAccords: ["fresh", "fruity", "woody"], season: ["Spring", "Summer"], occasion: ["Daily"], longevity: "Long lasting", sillage: "Moderate", rating: 4.5, ratingCount: 5230 },
  { brandName: "Dior", name: "Sauvage", canonicalId: "dior-sauvage", concentration: "EDT", gender: "Men", notesTop: ["Bergamot", "Pepper"], notesMiddle: ["Lavender", "Ambroxan"], notesBase: ["Cedar", "Vetiver"], mainAccords: ["fresh spicy", "aromatic"], season: ["Spring", "Summer", "Fall"], occasion: ["Daily"], longevity: "Long lasting", sillage: "Moderate", rating: 4.4, ratingCount: 18400 },
];

const catalog = [
  ["Lattafa", "Khamrah", "EDP"], ["Lattafa", "Asad", "EDP"], ["Lattafa", "Bade'e Al Oud Oud for Glory", "EDP"], ["Lattafa", "Yara", "EDP"], ["Lattafa", "Fakhar Black", "EDP"], ["Lattafa", "Honor & Glory", "EDP"], ["Lattafa", "Emeer", "EDP"],
  ["Afnan", "9PM", "EDP"], ["Afnan", "9PM Rebel", "EDP"], ["Afnan", "Turathi Blue", "EDP"], ["Afnan", "Supremacy Not Only Intense", "EDP"], ["Afnan", "Rare Carbon", "EDP"],
  ["Armaf", "Club de Nuit Milestone", "EDP"], ["Armaf", "Club de Nuit Sillage", "EDP"], ["Armaf", "Club de Nuit Untold", "EDP"], ["Armaf", "Tres Nuit", "EDT"],
  ["Rasasi", "Hawas for Him", "EDP"], ["Rasasi", "Hawas Ice", "EDP"], ["Rasasi", "La Yuqawam Homme", "EDP"],
  ["Al Haramain", "Amber Oud Gold Edition", "EDP"], ["Al Haramain", "Detour Noir", "EDP"], ["Al Haramain", "L'Aventure", "EDP"],
  ["Maison Alhambra", "Tobacco Touch", "EDP"], ["Maison Alhambra", "Kismet Angel", "EDP"], ["Maison Alhambra", "The Tux", "EDP"], ["Maison Alhambra", "Yeah!", "EDP"],
  ["Fragrance World", "Imperium", "EDP"], ["Fragrance World", "Suits", "EDP"], ["Fragrance World", "Barakkat Rouge 540", "EDP"],
  ["French Avenue", "Spectre Ghost", "EDP"], ["French Avenue", "Liquid Brun", "EDP"],
  ["Dior", "Sauvage Elixir", "Parfum"], ["Dior", "Homme Intense", "EDP"], ["Dior", "Homme 2020", "EDT"],
  ["Chanel", "Bleu de Chanel", "EDP"], ["Chanel", "Allure Homme Sport", "EDT"], ["Yves Saint Laurent", "Y Eau de Parfum", "EDP"], ["Yves Saint Laurent", "La Nuit de L'Homme", "EDT"],
  ["Jean Paul Gaultier", "Le Male Le Parfum", "EDP"], ["Jean Paul Gaultier", "Ultra Male", "EDT"], ["Giorgio Armani", "Acqua di Gio Profondo", "EDP"], ["Giorgio Armani", "Stronger With You Intensely", "EDP"],
  ["Prada", "Luna Rossa Carbon", "EDT"], ["Versace", "Dylan Blue", "EDT"], ["Versace", "Eros", "EDT"], ["Valentino", "Uomo Born in Roma", "EDT"],
  ["Rabanne", "1 Million", "EDT"], ["Rabanne", "Invictus", "EDT"], ["Montblanc", "Explorer", "EDP"], ["Narciso Rodriguez", "For Him Bleu Noir", "EDP"],
];

const genericAccords = ["woody", "aromatic", "fresh", "amber", "sweet"];

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function sqlStr(s) {
  return `'${String(s).replace(/'/g, "''")}'`;
}
function sqlArr(arr) {
  if (!arr || !arr.length) return "'{}'";
  return `ARRAY[${arr.map((x) => sqlStr(x)).join(",")}]`;
}
function sqlNum(n) {
  return n === undefined || n === null ? "null" : String(n);
}
// notes_top/middle/base and main_accords are jsonb ([{name, weight|strength}])
// in the current schema; this mock catalog has no real weight data, so every
// term gets weight/strength null rather than a made-up number.
function sqlJsonTerms(arr) {
  const list = arr && arr.length ? arr.map((name) => ({ name, weight: null })) : [];
  return `'${JSON.stringify(list).replace(/'/g, "''")}'::jsonb`;
}
// seasons/daypart are vote-count jsonb objects in the current schema
// ({"Winter": 12, ...}) rather than plain text[] — this mock data has no
// real vote counts, so each stated label just gets a nominal count of 1.
function sqlJsonVotes(labels) {
  const obj = {};
  (labels || []).forEach((l) => (obj[l] = 1));
  return `'${JSON.stringify(obj).replace(/'/g, "''")}'::jsonb`;
}

const generated = catalog
  .filter((x) => !base.some((b) => b.name === x[1] && b.brandName === x[0]))
  .map((x) => ({
    brandName: x[0],
    name: x[1],
    concentration: x[2],
    canonicalId: slug(`${x[0]}-${x[1]}`),
    gender: "Unisex",
    notesTop: [], notesMiddle: [], notesBase: [],
    mainAccords: genericAccords.slice(0, 3),
    season: ["All season"],
    occasion: ["Everyday"],
    longevity: undefined, sillage: undefined, rating: undefined, ratingCount: 0,
  }));

const allFragrances = [...base, ...generated];

const brandNames = [...new Set(allFragrances.map((f) => f.brandName))];

let sql = `-- Generated by scripts/generate-seed.mjs — mirrors lib/mock-data.ts so a fresh
-- Supabase project starts with the same catalog the local fallback uses.
-- Run supabase/schema.sql first, then this file.

insert into brands (name, aliases)
values
${brandNames.map((n) => `  (${sqlStr(n)}, '{}')`).join(",\n")}
on conflict (name) do nothing;

insert into fragrances (brand_id, name, concentration, canonical_id, aliases, gender, notes_top, notes_middle, notes_base, main_accords, seasons, daypart, longevity_label, sillage_label, rating_avg, rating_count, source, license)
select b.id, v.name, v.concentration, v.canonical_id, ARRAY[v.name], v.gender, v.notes_top::jsonb, v.notes_middle::jsonb, v.notes_base::jsonb, v.main_accords::jsonb, v.seasons::jsonb, v.daypart::jsonb, v.longevity, v.sillage, v.rating, v.rating_count, 'catalog_seed', 'FragranceLab demo data — not from a third-party dataset'
from (values
${allFragrances
  .map(
    (f) =>
      `  (${sqlStr(f.brandName)}, ${sqlStr(f.name)}, ${sqlStr(f.concentration)}, ${sqlStr(f.canonicalId)}, ${sqlStr(f.gender)}, ${sqlJsonTerms(f.notesTop)}, ${sqlJsonTerms(f.notesMiddle)}, ${sqlJsonTerms(f.notesBase)}, ${sqlJsonTerms(f.mainAccords)}, ${sqlJsonVotes(f.season)}, ${sqlJsonVotes(f.occasion)}, ${f.longevity ? sqlStr(f.longevity) : "null"}, ${f.sillage ? sqlStr(f.sillage) : "null"}, ${sqlNum(f.rating)}, ${sqlNum(f.ratingCount)})`
  )
  .join(",\n")}
) as v(brand_name, name, concentration, canonical_id, gender, notes_top, notes_middle, notes_base, main_accords, seasons, daypart, longevity, sillage, rating, rating_count)
join brands b on b.name = v.brand_name
on conflict (canonical_id) do nothing;

insert into price_records (fragrance_id, retailer_name, country, currency, price, bottle_size_ml, source, match_confidence)
select f.id, v.retailer_name, v.country, v.currency, v.price, v.bottle_size_ml, v.source, v.match_confidence
from (values
  ('french-avenue-liquid-brun', 'Perfume Shop BD', 'Bangladesh', 'BDT', 3650, 100, 'scraped', null),
  ('french-avenue-liquid-brun', 'Fragrance Direct UK', 'United Kingdom', 'GBP', 42, 100, 'serp_api', 0.94),
  ('lattafa-khamrah-qahwa', 'ScentZone', 'Bangladesh', 'BDT', 2950, 100, 'scraped', null),
  ('dior-sauvage', 'Sundora', 'Bangladesh', 'BDT', 12500, 100, 'scraped', null),
  ('dior-sauvage', 'Chemist Warehouse', 'Australia', 'AUD', 145, 100, 'serp_api', 0.98)
) as v(canonical_id, retailer_name, country, currency, price, bottle_size_ml, source, match_confidence)
join fragrances f on f.canonical_id = v.canonical_id
on conflict do nothing;
`;

writeFileSync(new URL("../supabase/seed.sql", import.meta.url), sql);
console.log("Wrote supabase/seed.sql with", allFragrances.length, "fragrances and", brandNames.length, "brands.");
