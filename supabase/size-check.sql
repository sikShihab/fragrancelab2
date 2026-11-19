-- Run after importing a sample (e.g. --limit 2000) and extrapolate to the full set.
select relname, pg_size_pretty(pg_total_relation_size(oid)) as total,
       pg_size_pretty(pg_relation_size(oid)) as table_only
from pg_class where relname in ('fragrances','fragrance_images','fragrance_similar','brands','price_records')
order by pg_total_relation_size(oid) desc;
select count(*) as fragrances, pg_size_pretty(pg_total_relation_size('fragrances')::bigint / greatest(count(*),1)) as avg_bytes_per_row from fragrances;
select pg_size_pretty(pg_database_size(current_database())) as database_total;
