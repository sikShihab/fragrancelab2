# Deploying FragranceLab (Vercel + Supabase, free tiers)

## 1. Supabase
1. Create a project. In the SQL editor run, in order:
   - `supabase/schema.sql`
   - `supabase/search_v2.sql`
   (Existing database instead? Run `supabase/migrations/20260927_catalog_operations.sql`, then `20261024_search_v2.sql`.)
2. Settings > API: copy the project URL and the anon key.
3. Authentication > URL configuration: set Site URL to your Vercel URL. Decide whether email confirmation is on; the login page handles both.

## 2. Load data (small first)
```
SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=... \
  node scripts/import-fragrantica.mjs perfumes.jsonl --limit 2000
```
Then run `supabase/size-check.sql`. Multiply "avg_bytes_per_row" by the full row count and compare to your plan's database limit before importing all 140K. The service role key is a one-off shell secret: never put it in Vercel env or `.env.local`.

## 3. Vercel
Import the repo, then set environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL` (your production URL)
- `NEXT_PUBLIC_FRAGRANCELAB_IMAGE_MODE=dataset` to show the dataset photos publicly (hotlinked from the source, not copied, with a credit line). Leave unset to hide them.
- `OPENAI_API_KEY` (optional; the advisor works without it)

After deploy: open `/api/health` (expects `database: ok`), `/sitemap.xml`, and a fragrance page.

## 4. Photos
Dataset photos show only in `dataset` mode. To show real photos, upload files you own or are licensed to use to the `fragrance-photos` Storage bucket, then register them:
```
npm run import:authorized-images -- images.csv
```
(columns: canonical_id,source_url,thumbnail_url,provider,license_status,attribution,verified,priority). Until then cards show the brand and name set in type.

## Licensing
The Fragrantica-derived dataset is CC BY-NC-SA 4.0. Keep the site non-commercial (no ads, no paid tier, no affiliate links) and keep the footer attribution. Going commercial means replacing the catalog data, not just the images.

## Known limits
- The advisor rate limiter is per server instance; add Upstash/Vercel KV for a shared limit.
- Search is prefix/word based with no typo tolerance.
- Deal Lab shows prices in their own currencies; add a rate source before ranking across markets.
