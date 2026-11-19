import { CollectionItem, DealStatus, Fragrance, PriceRecord } from "./types";

const now = new Date().toISOString();

const base: Array<Partial<Fragrance> & Pick<Fragrance,"id"|"brandName"|"name"|"canonicalId">> = [
  {id:"f1",brandName:"French Avenue",name:"Liquid Brun",canonicalId:"french-avenue-liquid-brun",concentration:"EDP",gender:"Unisex",notesTop:["Orange Blossom","Cardamom"],notesMiddle:["Praline","Cinnamon"],notesBase:["Vanilla","Tonka Bean"],mainAccords:["sweet","warm spicy","vanilla"],season:["Winter","Fall"],occasion:["Date Night","Evening"],longevity:"Long lasting",sillage:"Moderate",rating:4.3,ratingCount:812},
  {id:"f2",brandName:"Lattafa",name:"Khamrah Qahwa",canonicalId:"lattafa-khamrah-qahwa",concentration:"EDP",gender:"Unisex",notesTop:["Coffee","Cinnamon"],notesMiddle:["Dates","Saffron"],notesBase:["Amber","Musk"],mainAccords:["warm spicy","coffee","sweet"],season:["Winter"],occasion:["Evening"],longevity:"Very long lasting",sillage:"Heavy",rating:4.6,ratingCount:2140},
  {id:"f3",brandName:"Armaf",name:"Club de Nuit Intense Man",canonicalId:"armaf-club-de-nuit-intense-man",concentration:"EDT",gender:"Men",notesTop:["Pineapple","Blackcurrant"],notesMiddle:["Birch","Jasmine"],notesBase:["Musk","Ambergris"],mainAccords:["fresh","fruity","woody"],season:["Spring","Summer"],occasion:["Daily"],longevity:"Long lasting",sillage:"Moderate",rating:4.5,ratingCount:5230},
  {id:"f4",brandName:"Dior",name:"Sauvage",canonicalId:"dior-sauvage",concentration:"EDT",gender:"Men",notesTop:["Bergamot","Pepper"],notesMiddle:["Lavender","Ambroxan"],notesBase:["Cedar","Vetiver"],mainAccords:["fresh spicy","aromatic"],season:["Spring","Summer","Fall"],occasion:["Daily"],longevity:"Long lasting",sillage:"Moderate",rating:4.4,ratingCount:18400},
];

const catalog = [
  ["Lattafa","Khamrah","EDP"],["Lattafa","Asad","EDP"],["Lattafa","Bade'e Al Oud Oud for Glory","EDP"],["Lattafa","Yara","EDP"],["Lattafa","Fakhar Black","EDP"],["Lattafa","Honor & Glory","EDP"],["Lattafa","Emeer","EDP"],
  ["Afnan","9PM","EDP"],["Afnan","9PM Rebel","EDP"],["Afnan","Turathi Blue","EDP"],["Afnan","Supremacy Not Only Intense","EDP"],["Afnan","Rare Carbon","EDP"],
  ["Armaf","Club de Nuit Milestone","EDP"],["Armaf","Club de Nuit Sillage","EDP"],["Armaf","Club de Nuit Untold","EDP"],["Armaf","Tres Nuit","EDT"],
  ["Rasasi","Hawas for Him","EDP"],["Rasasi","Hawas Ice","EDP"],["Rasasi","La Yuqawam Homme","EDP"],
  ["Al Haramain","Amber Oud Gold Edition","EDP"],["Al Haramain","Detour Noir","EDP"],["Al Haramain","L'Aventure","EDP"],
  ["Maison Alhambra","Tobacco Touch","EDP"],["Maison Alhambra","Kismet Angel","EDP"],["Maison Alhambra","The Tux","EDP"],["Maison Alhambra","Yeah!","EDP"],
  ["Fragrance World","Imperium","EDP"],["Fragrance World","Suits","EDP"],["Fragrance World","Barakkat Rouge 540","EDP"],
  ["French Avenue","Spectre Ghost","EDP"],["French Avenue","Liquid Brun","EDP"],
  ["Dior","Sauvage Elixir","Parfum"],["Dior","Homme Intense","EDP"],["Dior","Homme 2020","EDT"],
  ["Chanel","Bleu de Chanel","EDP"],["Chanel","Allure Homme Sport","EDT"],["Yves Saint Laurent","Y Eau de Parfum","EDP"],["Yves Saint Laurent","La Nuit de L'Homme","EDT"],
  ["Jean Paul Gaultier","Le Male Le Parfum","EDP"],["Jean Paul Gaultier","Ultra Male","EDT"],["Giorgio Armani","Acqua di Gio Profondo","EDP"],["Giorgio Armani","Stronger With You Intensely","EDP"],
  ["Prada","Luna Rossa Carbon","EDT"],["Versace","Dylan Blue","EDT"],["Versace","Eros","EDT"],["Valentino","Uomo Born in Roma","EDT"],
  ["Rabanne","1 Million","EDT"],["Rabanne","Invictus","EDT"],["Montblanc","Explorer","EDP"],["Narciso Rodriguez","For Him Bleu Noir","EDP"]
];

const genericAccords = ["woody","aromatic","fresh","amber","sweet"];
const generated: Fragrance[] = catalog.map((x,i)=>({
  id:`cat-${i+1}`, brandId:`brand-${x[0].toLowerCase().replace(/[^a-z0-9]+/g,"-")}`, brandName:x[0], name:x[1], concentration:x[2], canonicalId:`${x[0]}-${x[1]}`.toLowerCase().replace(/[^a-z0-9]+/g,"-"), aliases:[x[1]], gender:"Unisex", notesTop:[], notesMiddle:[], notesBase:[], mainAccords:[], season:[], occasion:[], rating:undefined, ratingCount:0, source:"catalog_seed", lastUpdated:now
}));

// Keep the four demo records as fully detailed examples, while the catalog is now scalable.
export const fragrances: Fragrance[] = [...base.map((f,i)=>({brandId:`b${i+1}`,aliases:[f.name!],source:"catalog_seed",ratingCount:f.ratingCount??0,lastUpdated:now,...f} as Fragrance)), ...generated.filter(g=>!base.some(b=>b.name===g.name && b.brandName===g.brandName))];

export const priceRecords: PriceRecord[] = [
  {id:"p1",fragranceId:"f1",retailerName:"Perfume Shop BD",country:"Bangladesh",currency:"BDT",price:3650,bottleSizeMl:100,source:"scraped",lastUpdated:now},
  {id:"p2",fragranceId:"f1",retailerName:"Fragrance Direct UK",country:"United Kingdom",currency:"GBP",price:42,bottleSizeMl:100,source:"serp_api",matchConfidence:.94,lastUpdated:now},
  {id:"p3",fragranceId:"f2",retailerName:"ScentZone",country:"Bangladesh",currency:"BDT",price:2950,bottleSizeMl:100,source:"scraped",lastUpdated:now},
  {id:"p4",fragranceId:"f4",retailerName:"Sundora",country:"Bangladesh",currency:"BDT",price:12500,bottleSizeMl:100,source:"scraped",lastUpdated:now},
  {id:"p5",fragranceId:"f4",retailerName:"Chemist Warehouse",country:"Australia",currency:"AUD",price:145,bottleSizeMl:100,source:"serp_api",matchConfidence:.98,lastUpdated:now},
];
export const dealStatus: DealStatus[] = [
  {fragranceId:"f1",country:"United Kingdom",state:"available"},{fragranceId:"f2",country:"United Kingdom",state:"not_listed_elsewhere"},{fragranceId:"f2",country:"Australia",state:"pending"},{fragranceId:"f4",country:"Australia",state:"available"}
];
export const myCollection: CollectionItem[] = [{id:"c1",userId:"demo-user",fragranceId:"f1",dateAcquired:"2025-11-02"},{id:"c2",userId:"demo-user",fragranceId:"f2",dateAcquired:"2026-01-15"}];
