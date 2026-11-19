-- Search v2: brand-aware, prefix matching, ranked, capped count.
-- Idempotent. Included by schema.sql and by migrations/20261024_search_v2.sql.

create or replace function fl_names(j jsonb) returns text language sql immutable as $$
  select coalesce(string_agg(e->>'name', ' '), '')
  from jsonb_array_elements(case when jsonb_typeof(j) = 'array' then j else '[]'::jsonb end) e
$$;

create or replace function fl_vote_keys(j jsonb) returns text language sql immutable as $$
  select coalesce(string_agg(replace(k, '_', ' '), ' '), '')
  from jsonb_object_keys(case when jsonb_typeof(j) = 'object' then j else '{}'::jsonb end) k
$$;

-- Only real words are indexed (no jsonb keys like "weight"/"strength"), and the
-- brand name is part of the document so "dior sauvage" works.
create or replace function fl_refresh_search() returns trigger language plpgsql as $$
declare b_name text; b_aliases text;
begin
  select name, array_to_string(aliases, ' ') into b_name, b_aliases from brands where id = new.brand_id;
  new.search_text := lower(concat_ws(' ', b_name, b_aliases, new.name, array_to_string(new.aliases, ' '), new.canonical_id,
    fl_names(new.notes_top), fl_names(new.notes_middle), fl_names(new.notes_base), fl_names(new.notes_flat),
    fl_names(new.main_accords), fl_vote_keys(new.seasons), fl_vote_keys(new.daypart)));
  new.search_document := to_tsvector('simple', new.search_text);
  return new;
end $$;

drop trigger if exists fragrances_search_refresh on fragrances;
create trigger fragrances_search_refresh
  before insert or update of brand_id, name, aliases, canonical_id, notes_top, notes_middle, notes_base, notes_flat, main_accords, seasons, daypart
  on fragrances for each row execute function fl_refresh_search();

create or replace function fl_brand_search_refresh() returns trigger language plpgsql as $$
begin update fragrances set brand_id = brand_id where brand_id = new.id; return new; end $$;
drop trigger if exists brands_search_refresh on brands;
create trigger brands_search_refresh after update of name, aliases on brands for each row execute function fl_brand_search_refresh();

-- "sauv dior" -> 'sauv':* & 'dior':*  (max 8 words, punctuation stripped)
create or replace function fl_prefix_query(q text) returns tsquery language sql immutable as $$
  select case when t is null then null else to_tsquery('simple', t) end
  from (select string_agg(w || ':*', ' & ') as t from (
    select w from regexp_split_to_table(lower(regexp_replace(coalesce(q, ''), '[^[:alnum:]\s]', ' ', 'g')), '\s+') w
    where length(w) > 0 limit 8) s) x
$$;

-- total_count is capped at 1000 (meaning "1000 or more") so paging never has to
-- count every match.
create or replace function search_catalog_ids(
  p_query text default null, p_filter text default null, p_limit int default 24, p_offset int default 0
) returns table(fragrance_id uuid, total_count bigint)
language plpgsql stable as $$
declare
  pq tsquery := fl_prefix_query(p_query);
  fq tsquery := fl_prefix_query(p_filter);
  v_lim int := least(greatest(coalesce(p_limit, 24), 1), 60);
  v_ofs int := greatest(coalesce(p_offset, 0), 0);
  tot bigint;
begin
  select count(*) into tot from (
    select 1 from fragrances f
    where (pq is null or f.search_document @@ pq) and (fq is null or f.search_document @@ fq) limit 1000) s;
  if pq is null then
    return query select f.id, tot from fragrances f
      where (fq is null or f.search_document @@ fq)
      order by f.popularity_magnitude desc nulls last, f.rating_count desc nulls last, f.name
      limit v_lim offset v_ofs;
  else
    return query select f.id, tot from fragrances f
      where f.search_document @@ pq and (fq is null or f.search_document @@ fq)
      order by ts_rank_cd(f.search_document, pq) desc, f.popularity_magnitude desc nulls last, f.name
      limit v_lim offset v_ofs;
  end if;
end $$;

-- Create a profile row on signup (profiles had no writer before).
create or replace function fl_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function fl_new_user();

-- Public bucket for photos you own or are licensed to show. Writes need the service role.
insert into storage.buckets (id, name, public) values ('fragrance-photos', 'fragrance-photos', true) on conflict do nothing;
