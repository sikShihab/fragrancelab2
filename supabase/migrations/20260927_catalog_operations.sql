-- Apply this to an existing FragranceLab database before deploying the
-- paginated catalog, image-health, and price-alert features.
alter table fragrances add column if not exists search_document tsvector generated always as (
  to_tsvector('simple', concat_ws(' ', name, canonical_id, array_to_string(aliases, ' '), notes_top::text, notes_middle::text, notes_base::text, notes_flat::text, main_accords::text, seasons::text, daypart::text))
) stored;
alter table fragrance_images add column if not exists availability_status text not null default 'unknown' check (availability_status in ('available','unavailable','unknown'));
alter table fragrance_images add column if not exists last_error text;
alter table price_records add column if not exists source_key text unique;
alter table price_records add column if not exists observed_at timestamptz default now();

create index if not exists fragrances_search_idx on fragrances using gin(search_document);
create index if not exists price_records_fragrance_country_idx on price_records(fragrance_id, country, price);

create or replace function search_catalog_ids(
  p_query text default null,
  p_filter text default null,
  p_limit int default 24,
  p_offset int default 0
) returns table(fragrance_id uuid, total_count bigint)
language sql stable as $$
  with matches as (
    select f.id, count(*) over() as total_count
    from fragrances f join brands b on b.id = f.brand_id
    where (nullif(trim(p_query), '') is null or f.search_document @@ websearch_to_tsquery('simple', trim(p_query)) or b.name ilike '%' || trim(p_query) || '%' or array_to_string(b.aliases, ' ') ilike '%' || trim(p_query) || '%')
      and (nullif(trim(p_filter), '') is null or f.search_document @@ websearch_to_tsquery('simple', trim(p_filter)))
    order by f.popularity_magnitude desc nulls last, f.rating_count desc nulls last, f.name asc
  ) select id, total_count from matches
  limit least(greatest(coalesce(p_limit, 24), 1), 60) offset greatest(coalesce(p_offset, 0), 0)
$$;
