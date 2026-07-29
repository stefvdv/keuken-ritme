-- ============================================================
--  Ritme — database-update 8 (voorraad)
--  Nieuw kopje Voorraad: producten, hoeveelheden, verpakking,
--  ingrediënten, productie- en houdbaarheidsdatum.
--  Plak dit in Supabase → SQL Editor → New query → Run.
--  Er wordt niets verwijderd; veilig opnieuw uit te voeren.
-- ============================================================

create table if not exists voorraad (
  id              text primary key,
  product         text not null,
  qty             numeric not null default 0,   -- huidige (dynamische) voorraad
  initial_qty     numeric not null default 0,   -- ooit gemaakte hoeveelheid (voor de Excel-export)
  unit            text default '',              -- verpakkingseenheid, bv. "250 g pot"
  ingredients     jsonb not null default '[]'::jsonb,
  production_date date,
  expiry_date     date,
  made_by         text default '',
  recipe_id       text,
  created_at      timestamptz not null default now()
);
create index if not exists voorraad_expiry_idx on voorraad (expiry_date);

alter table voorraad enable row level security;

drop policy if exists "team leest voorraad" on voorraad;
create policy "team leest voorraad" on voorraad
  for select to authenticated using (true);

drop policy if exists "team beheert voorraad" on voorraad;
create policy "team beheert voorraad" on voorraad
  for all to authenticated using (true) with check (true);

-- Controle: hoort één regel terug te geven.
select table_name from information_schema.tables
 where table_schema = 'public' and table_name = 'voorraad';
