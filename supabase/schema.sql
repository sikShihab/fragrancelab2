-- FragranceLab production schema — encyclopedia-scale catalog.
-- Run after enabling Supabase Auth. Supersedes the earlier narrower schema
-- (nothing has been deployed to production against that version, so this
-- is a clean rewrite rather than a migration).
create extension if not exists "pgcrypto";
create extension if not exists pg_trgm;

-- ==================================================================
-- IDENTITY
-- ==================================================================
create table if not exists profiles(
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text, avatar_url text, bio text,
  home_market text default 'Bangladesh',
  created_at timestamptz default now()
);

create table if not exists brands(
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  aliases text[] not null default '{}',
  country_of_origin text,
  website text,
  logo_url text                          -- only ever a real/authorized asset; never generated
);

create table if not exists perfumers(
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text,                             -- source slug, for dedupe on re-import
  image_id int                           -- source's internal image id, NOT a usable image URL
);

-- ==================================================================
-- CATALOG
-- ==================================================================
-- Every row must be traceable to where it came from and what license it
-- came under (spec section 18: "development data != production data").
-- No row is exempt from this — a null source/license is a bug, not a
-- shortcut.
create table if not exists fragrances(
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id),
  name text not null,
  canonical_id text unique not null,     -- our stable slug; used in routes
  aliases text[] not null default '{}',
  concentration text,                    -- best-effort parse; often unknown, left null rather than guessed
  gender text,
  year int,
  collection text,
  description text,                      -- verbatim source prose — see license below before ever showing it in a commercial build

  -- structured notes/accords, weighted where the source provides weights.
  -- kept as jsonb ([{name, weight|strength}]) rather than flat text[] so the
  -- intensity data isn't thrown away; app-facing code can still read plain
  -- names off these when it only needs a list.
  notes_top jsonb not null default '[]',
  notes_middle jsonb not null default '[]',
  notes_base jsonb not null default '[]',
  notes_flat jsonb not null default '[]',   -- used instead of top/middle/base when the source has no tiering
  main_accords jsonb not null default '[]', -- [{name, strength 0-100}]

  -- performance + community data. *_avg mirrors the source average as-is;
  -- *_label is a small derived bucket (see import script) for quick display
  -- — never treat the label as raw data, it's a readability convenience.
  rating_avg numeric(3,2),
  rating_count int default 0,
  rating_histogram jsonb not null default '[]',
  longevity_avg numeric(3,2),
  longevity_label text,
  longevity_histogram jsonb not null default '[]',
  sillage_avg numeric(3,2),
  sillage_label text,
  sillage_histogram jsonb not null default '[]',
  price_value_avg numeric(3,2),          -- "value for money" vote, NOT a price — never render this as a price
  price_value_histogram jsonb not null default '[]',

  relation_have int, relation_had int, relation_want int,
  community_gender jsonb not null default '{}',
  seasons jsonb not null default '{}',
  daypart jsonb not null default '{}',
  people_count int,
  popularity_magnitude int,
  ai_pros jsonb not null default '[]',
  ai_cons jsonb not null default '[]',

  -- Maintained by trigger fl_refresh_search (see search_v2.sql): brand + name + notes names.
  search_text text,
  search_document tsvector,

  -- Legacy fields retained for existing deployments. New image handling lives
  -- exclusively in fragrance_images below; catalog reads never render these.
  image_url text,
  image_source text,
  external_image_url text,

  -- provenance — required on every row.
  source text not null default 'catalog',
  source_url text,
  external_provider text,                -- e.g. 'fragrantica'
  external_id int,                       -- source's numeric id, for re-import dedupe and similar-fragrance resolution
  external_slug text,
  license text,                          -- e.g. 'CC BY-NC-SA 4.0 — dev/testing only, not cleared for commercial redistribution'

  last_updated timestamptz default now(),
  created_at timestamptz default now()
);

-- IMAGE ASSETS / PROVIDERS
-- This is intentionally independent of fragrance metadata. A source can be
-- swapped for a licensed provider without rewriting the catalog or UI.
-- Source URLs are pointers, never downloaded into this repository.
create table if not exists fragrance_images(
  id uuid primary key default gen_random_uuid(),
  fragrance_id uuid not null references fragrances(id) on delete cascade,
  source_url text,
  thumbnail_url text,
  provider text not null,
  license_status text not null default 'unknown' check (license_status in ('development_reference','licensed','authorized','owned','unknown','unavailable')),
  attribution text,
  verified boolean not null default false,
  last_checked timestamptz,
  image_type text not null default 'bottle' check (image_type in ('bottle','packshot','thumbnail','editorial')),
  priority int not null default 0,
  availability_status text not null default 'unknown' check (availability_status in ('available','unavailable','unknown')),
  last_error text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(fragrance_id, provider)
);

create table if not exists fragrance_perfumers(
  fragrance_id uuid not null references fragrances(id) on delete cascade,
  perfumer_id uuid not null references perfumers(id) on delete cascade,
  primary key(fragrance_id, perfumer_id)
);

-- "Similar fragrance" graph. Resolved by joining on external_id rather than
-- storing a second uuid fk, so this table can be populated in the same pass
-- as `fragrances` without a two-phase id-resolution step; a row with no
-- matching external_id just means that neighbor wasn't in this import batch.
create table if not exists fragrance_similar(
  fragrance_id uuid not null references fragrances(id) on delete cascade,
  similar_external_id int not null,
  similar_slug text,
  kind text not null check (kind in ('reminds_me_of','also_liked')),
  up_votes int, down_votes int,
  primary key(fragrance_id, similar_external_id, kind)
);

-- ==================================================================
-- USER DATA
-- ==================================================================
create table if not exists collection_items(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fragrance_id uuid not null references fragrances(id),
  rating numeric(2,1), notes text,
  date_acquired date, last_worn date,
  created_at timestamptz default now(),
  unique(user_id, fragrance_id)
);

create table if not exists wishlist_items(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fragrance_id uuid not null references fragrances(id),
  target_price numeric(12,2), notes text,
  created_at timestamptz default now(),
  unique(user_id, fragrance_id)
);

-- Real retailer price intelligence — unrelated to price_value_avg above,
-- which is a crowd "value for money" opinion, not a price.
create table if not exists price_records(
  id uuid primary key default gen_random_uuid(),
  fragrance_id uuid not null references fragrances(id) on delete cascade,
  retailer_name text, country text not null, currency text not null,
  price numeric(12,2) not null, bottle_size_ml int, url text,
  source text, match_confidence numeric(4,3),
  source_key text unique,
  observed_at timestamptz default now(),
  last_updated timestamptz default now()
);

-- Alerts are evaluated by a trusted scheduled job. The job records events;
-- an email/push provider can deliver those events later without touching the
-- price ingestion pipeline.
create table if not exists deal_alerts(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fragrance_id uuid not null references fragrances(id) on delete cascade,
  country text not null default 'Bangladesh',
  target_price numeric(12,2) not null check (target_price > 0),
  enabled boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, fragrance_id, country)
);

create table if not exists deal_alert_events(
  id uuid primary key default gen_random_uuid(),
  deal_alert_id uuid not null references deal_alerts(id) on delete cascade,
  price_record_id uuid not null references price_records(id) on delete cascade,
  observed_price numeric(12,2) not null,
  created_at timestamptz default now(),
  unique(deal_alert_id, price_record_id)
);

-- ==================================================================
-- SEARCH + PERFORMANCE
-- ==================================================================
-- At 140K+ rows the app must never pull the whole table to the browser —
-- these indexes are what make server-side search/pagination fast.
create index if not exists fragrances_name_trgm_idx on fragrances using gin(name gin_trgm_ops);
create index if not exists fragrances_search_idx on fragrances using gin(
  search_document
);
create index if not exists fragrances_brand_idx on fragrances(brand_id);
create index if not exists fragrances_canonical_idx on fragrances(canonical_id);
create index if not exists fragrances_popularity_idx on fragrances(popularity_magnitude desc nulls last);
create index if not exists fragrances_rating_idx on fragrances(rating_avg desc nulls last);
create index if not exists fragrances_external_idx on fragrances(external_provider, external_id);
create index if not exists fragrance_images_fragrance_idx on fragrance_images(fragrance_id, priority desc);
create index if not exists price_records_fragrance_country_idx on price_records(fragrance_id, country, price);
create index if not exists deal_alerts_active_idx on deal_alerts(fragrance_id, country) where enabled;
create index if not exists fragrance_similar_fragrance_idx on fragrance_similar(fragrance_id);
create index if not exists fragrance_similar_external_idx on fragrance_similar(similar_external_id);
create index if not exists brands_name_trgm_idx on brands using gin(name gin_trgm_ops);

-- Search function, triggers, profile-on-signup and storage bucket live in search_v2.sql.
-- schema.sql is applied by pasting this file and then search_v2.sql, in that order.

-- ==================================================================
-- ROW LEVEL SECURITY
-- ==================================================================
alter table profiles enable row level security;
alter table collection_items enable row level security;
alter table wishlist_items enable row level security;
alter table fragrances enable row level security;
alter table price_records enable row level security;
alter table brands enable row level security;
alter table perfumers enable row level security;
alter table fragrance_perfumers enable row level security;
alter table fragrance_similar enable row level security;
alter table fragrance_images enable row level security;
alter table deal_alerts enable row level security;
alter table deal_alert_events enable row level security;

create policy "public catalog read" on fragrances for select using(true);
create policy "public brand read" on brands for select using(true);
create policy "public perfumer read" on perfumers for select using(true);
create policy "public fragrance_perfumers read" on fragrance_perfumers for select using(true);
create policy "public similar read" on fragrance_similar for select using(true);
create policy "public fragrance image read" on fragrance_images for select using(true);
create policy "deal alert owner" on deal_alerts for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "deal alert event owner" on deal_alert_events for select using(
  exists(select 1 from deal_alerts a where a.id = deal_alert_id and a.user_id = auth.uid())
);
create policy "public price read" on price_records for select using(true);

create policy "profile owner" on profiles for all using(auth.uid()=id) with check(auth.uid()=id);
create policy "collection owner" on collection_items for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "wishlist owner" on wishlist_items for all using(auth.uid()=user_id) with check(auth.uid()=user_id);

-- Note: no insert/update policy exists on the catalog tables (fragrances,
-- brands, perfumers, price_records) for anon/authenticated roles — bulk
-- ingestion must run with the Supabase service role key, which bypasses RLS.
-- Never ship the service role key to the browser.
