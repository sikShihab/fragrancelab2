# FragranceLab — catalog-first product foundation

This version is intentionally **not** a landing-page-only demo.

## Product flows
- `/login` — preview auth flow; connect Supabase for production authentication.
- `/profile` — user identity, collection and want-to-buy summary.
- `/discover` — indexed, server-paginated catalog search.
- `/discover/[id]` — fragrance detail.
- `/collection` — dark, illuminated shelf experience for owned bottles.
- `/wishlist` — want-to-buy list.
- `/compare` — compare fragrances.
- `/deal-lab` — market-price layer.
- `/ask` — collection-aware live-catalog advisor.
- `/settings` — market and recommendation preferences.

## Real product photography
No AI-generated bottle artwork is used as product photography in this version. Image records are independent of catalog records and are resolved through the image service; when no appropriate source is available (or loading fails), the UI shows an explicit unavailable-image fallback.

A production importer should ingest images from sources where FragranceLab has permission to use them (official brand assets, licensed catalogs, or user-provided assets). Do not bulk-copy images from another site without checking its terms and image rights.

## Full catalog
The seed catalog is a development dataset. It is **not** a claim that every perfume on the market is present. For a real all-market catalog, connect a licensed fragrance database/data provider or an owned ingestion pipeline, then populate `brands`, `fragrances`, images, notes, aliases and prices.

## Authentication
The included local login is only a preview fallback. For production:
1. Create a Supabase project.
2. Put URL/key in `.env.local` using `.env.example`.
3. Run `supabase/schema.sql`, then `supabase/seed.sql` (see below) to populate a starting catalog.
4. Replace the local auth calls with Supabase Auth session calls (the schema already uses `auth.users`).

## Data layer
`lib/catalog.ts`, `lib/catalog-client.ts`, and `lib/collection-client.ts` are the only places pages should read/write fragrance, catalog, collection and wishlist data — no page imports `lib/mock-data.ts` directly.

- **Catalog reads** use `/api/catalog` and `searchFragrancePage`, which call the indexed `search_catalog_ids` database function and hydrate only one page of fragrance/image records. This is safe for the 140K+ catalog; it never downloads the whole catalog to the browser. `/api/ask` uses the same page-sized search via `lib/supabase-server.ts`.
- **Collection / wishlist reads and writes** (`getIds`, `toggleId` in `lib/collection-client.ts`) go to Supabase's `collection_items` / `wishlist_items` tables, scoped by the signed-in Supabase user (`auth.uid()`), whenever a Supabase session exists. With no Supabase session — local dev, or the offline demo fallback — they use `localStorage`, but namespaced per local account (`fl-owned:<email>`, keyed off `fl-user`) rather than one global key, so switching accounts in the same browser no longer shows one account's shelf to another.
- `lib/use-collection.ts` is a small hook (`useCollectionIds`) that loads owned/wanted ids once per page and re-syncs on a `fl-collection`/`fl-auth` event, so a grid of `FragranceCard`s does 2 queries total rather than one per card. Pages pass `owned`/`wanted` booleans down as props; `FragranceCard` itself only calls `toggleId` on click.
- Every fragrance is now linked to and looked up by `canonicalId` (e.g. `/discover/dior-sauvage`) instead of a backend-specific `id`, so links work the same whether `id` is a mock string (`f1`) or a Supabase `uuid`.

### Seeding a Supabase project
`node scripts/generate-seed.mjs` regenerates `supabase/seed.sql` from the exact same catalog data `lib/mock-data.ts` uses, so a fresh Supabase project starts with an equivalent dataset to the offline fallback. Run it after `schema.sql`:
```
psql "$SUPABASE_DB_URL" -f supabase/schema.sql
psql "$SUPABASE_DB_URL" -f supabase/seed.sql
```
This is still development seed data (see "Full catalog" above) — the 46 generated entries only carry brand/name/concentration, not real notes or accords. For a catalog that actually feels encyclopedia-scale, see the next section.

### Importing the 140K-fragrance dataset
`supabase/schema.sql` is built to hold the full Fragrantica-derived Kaggle dataset (`perfumes.jsonl`) — weighted notes/accords, perfumers, rating/longevity/sillage/price-value averages and histograms, community gender/season/daypart votes, popularity, and the "similar fragrances" graph, each row tagged with its own `source`/`license`/`external_*` provenance.

**Read this before running it:**
- The dataset is **CC BY-NC-SA 4.0** — non-commercial, share-alike. It's suitable for development/testing, not as-is for a commercial production catalog. Every imported row is tagged `source='fragrantica_dev_dataset'` and `license='CC BY-NC-SA 4.0 — dev/testing only, not cleared for commercial redistribution or as verified product photography'`, so anything gating a commercial launch can filter on that.
- **Image references are imported separately from catalog metadata.** Each dataset `picture`/`thumbnail` URL becomes a `fragrance_images` record with provider `fragrantica_dataset_reference`, `license_status='development_reference'`, attribution, verification state, and `last_checked`. The image service can render these remote references in development; it never downloads them, calls them verified product photography, or exposes them when `NEXT_PUBLIC_FRAGRANCELAB_IMAGE_MODE=commercial`. A future authorized provider only needs to add a higher-priority image record and provider adapter — no catalog or UI rewrite.
- Bulk insert requires the Supabase **service role key**, not the anon key — the catalog tables have no insert policy for anon/authenticated roles by design, so ingestion has to bypass RLS. Never put the service role key in `.env.local` or ship it to the browser; pass it as a one-off shell/CI secret.

Run `schema.sql` first, then:
```
SUPABASE_URL=https://xxxx.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=eyJ... \
node scripts/import-fragrantica.mjs /path/to/perfumes.jsonl --limit 2000   # try a small batch first
```
Drop `--limit` for the full 140K+ run (streams the file line-by-line in batches of 500 — safe on memory, but expect it to take a while against a live project). It upserts brands and perfumers by name, fragrances by `canonical_id` (auto-disambiguated on the ~1.4% of brand+name collisions), image references, and the perfumer/similar-fragrance junction tables.

### Image operations
Use `npm run check:images -- --limit=500` with service-role credentials to check remote image pointers without downloading them. It stores only availability, error context, and `last_checked`. To attach commercial-ready imagery later, use `npm run import:authorized-images -- images.csv`; this adds higher-priority independent image records and leaves fragrance metadata untouched.

### Price ingestion and deal alerts
Ingest normalized retailer observations with `npm run import:prices -- prices.csv`. Its `source_key` makes re-runs idempotent. Wishlist entries can set a Bangladesh target price; the scheduled `npm run evaluate:deal-alerts` job writes qualifying in-app alert events. Connect email, push, or another delivery provider to `deal_alert_events` only after choosing the appropriate notification service and consent flow.

### Existing databases
For an already-created Supabase database, apply [catalog operations migration](supabase/migrations/20260927_catalog_operations.sql) before deploying. New databases receive these structures from `supabase/schema.sql`.

## Ask FragranceLab
The UI works locally with deterministic catalog matching. If `OPENAI_API_KEY` is configured, `/api/ask` can use the Responses API; set `FRAGRANCELAB_AI_MODEL` as needed.
