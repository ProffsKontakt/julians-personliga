-- Jarvis — grundschema.
--
-- Varje tabell bär user_id och skyddas av radnivåsäkerhet mot auth.uid().
-- Ingen rad är läsbar eller skrivbar för någon annan än sin ägare, oavsett
-- vilken nyckel klienten använder. Det är hela poängen med upplägget: även om
-- den publika nyckeln läcker kommer man ingenstans utan en giltig session.
--
-- Kör: supabase db push   (eller klistra in i SQL-editorn i dashboarden)

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------------
-- Uppräkningar. Speglar lib/types.ts — ändras de där ska de ändras här.
-- ------------------------------------------------------------------

create type food_category as enum (
  'kott', 'fisk', 'agg', 'mejeri', 'frukt', 'gronsaker', 'notter-fron',
  'spannmal', 'fett-olja', 'dryck', 'godis-snacks', 'fardigmat',
  'krydda-sas', 'hushall', 'ovrigt'
);

create type unit as enum ('st', 'g', 'kg', 'ml', 'l', 'forp');
create type holding_kind as enum ('aktie', 'fond', 'etf', 'krypto', 'ranta');
create type account_type as enum ('ISK', 'KF', 'AF', 'PENSION', 'ANNAT');
create type currency as enum ('SEK', 'USD', 'EUR', 'NOK', 'DKK');
create type cashflow_type as enum ('insattning', 'uttag', 'utdelning', 'avgift');
create type receipt_source as enum ('llm', 'manuell');
create type muscle_group as enum (
  'brost', 'rygg', 'ben', 'axlar', 'armar', 'core', 'helkropp', 'kondition'
);

-- ------------------------------------------------------------------
-- Kvitton
-- ------------------------------------------------------------------

create table receipts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  store        text not null,
  purchased_at date not null,
  -- numeric, inte float: öresfel ackumuleras annars över hundratals rader.
  total        numeric(10, 2) not null,
  currency     currency not null default 'SEK',
  source       receipt_source not null default 'llm',
  -- Sökväg i Supabase Storage. Bilden ligger aldrig i databasen.
  image_path   text,
  note         text,
  created_at   timestamptz not null default now()
);

create table receipt_items (
  id           uuid primary key default gen_random_uuid(),
  receipt_id   uuid not null references receipts (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  -- Raden precis som den stod på kvittot. Behövs för att kunna rätta modellen.
  raw          text not null,
  name         text not null,
  brand        text,
  category     food_category not null default 'ovrigt',
  quantity     numeric(10, 3) not null default 1,
  unit         unit not null default 'st',
  weight_grams numeric(10, 2),
  volume_ml    numeric(10, 2),
  total_price  numeric(10, 2) not null,
  discount     numeric(10, 2),
  confidence   real check (confidence is null or (confidence >= 0 and confidence <= 1))
);

-- Kilopris som genererad kolumn: beräknas i databasen, kan inte hamna i otakt
-- med priset, och går att indexera och sortera på direkt.
alter table receipt_items
  add column price_per_kg numeric(10, 2)
  generated always as (
    case when weight_grams > 0 then (total_price / weight_grams) * 1000 end
  ) stored;

create index on receipts (user_id, purchased_at desc);
create index on receipt_items (user_id, category);
create index on receipt_items (receipt_id);
-- Driver produktvyn: samma vara över tid, oberoende av stavning i versaler.
create index on receipt_items (user_id, lower(name));

-- ------------------------------------------------------------------
-- Kapital
-- ------------------------------------------------------------------

create table holdings (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  kind          holding_kind not null,
  name          text not null,
  ticker        text,
  isin          text,
  quantity      numeric(18, 6) not null check (quantity > 0),
  avg_cost      numeric(18, 6) not null check (avg_cost >= 0),
  last_price    numeric(18, 6),
  last_price_at timestamptz,
  currency      currency not null default 'SEK',
  account       account_type not null default 'ISK',
  tags          text[] not null default '{}',
  created_at    timestamptz not null default now()
);

create table cashflows (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references auth.users (id) on delete cascade,
  date     date not null,
  -- Alltid positivt; typen bestämmer riktningen.
  amount   numeric(14, 2) not null check (amount > 0),
  type     cashflow_type not null,
  account  account_type not null default 'ISK',
  note     text
);

create index on holdings (user_id);
create index on holdings using gin (tags);
create index on cashflows (user_id, date desc);

-- ------------------------------------------------------------------
-- Kraft
-- ------------------------------------------------------------------

create table exercises (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  muscle     muscle_group not null default 'helkropp',
  bodyweight boolean not null default false,
  -- Samma övning ska inte kunna läggas in två gånger av misstag.
  unique (user_id, name)
);

create table programs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  -- Passen ligger som jsonb: strukturen ändras ofta och läses alltid i sin helhet.
  days       jsonb not null default '[]'::jsonb,
  archived   boolean not null default false,
  created_at timestamptz not null default now()
);

create table workouts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  date       date not null,
  name       text not null,
  program_id uuid references programs (id) on delete set null,
  day_id     text,
  bodyweight numeric(6, 2),
  note       text,
  created_at timestamptz not null default now()
);

create table workout_sets (
  id          uuid primary key default gen_random_uuid(),
  workout_id  uuid not null references workouts (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  exercise_id uuid not null references exercises (id) on delete cascade,
  -- Ordningen i passet. Set 1, 2, 3 … per övning.
  position    smallint not null default 1,
  weight      numeric(7, 2) not null default 0 check (weight >= 0),
  reps        smallint not null check (reps >= 0),
  rir         smallint,
  warmup      boolean not null default false
);

create index on workouts (user_id, date desc);
create index on workout_sets (workout_id);
create index on workout_sets (user_id, exercise_id);

-- ------------------------------------------------------------------
-- Radnivåsäkerhet
--
-- Utan detta är varje tabell öppen för alla med den publika nyckeln.
-- Supabase varnar om man glömmer det, men varningen är lätt att missa —
-- därför slås det på och policysätts i samma migration som tabellerna skapas.
-- ------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'receipts', 'receipt_items', 'holdings', 'cashflows',
    'exercises', 'programs', 'workouts', 'workout_sets'
  ]
  loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);

    -- En policy för allt. Samma villkor för läsning som för skrivning:
    -- raden måste tillhöra den inloggade. `with check` hindrar dessutom att
    -- man skriver en rad med någon annans user_id.
    execute format($f$
      create policy %I on %I
        for all
        to authenticated
        using (user_id = (select auth.uid()))
        with check (user_id = (select auth.uid()))
    $f$, t || '_agare', t);
  end loop;
end $$;

-- ------------------------------------------------------------------
-- Kvittobilder i Storage, samma ägarregel
-- ------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('kvitton', 'kvitton', false)
on conflict (id) do nothing;

-- Sökvägen är <user_id>/<filnamn>. Första mappnivån avgör ägarskapet.
create policy "kvitton_agare" on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'kvitton'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'kvitton'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
