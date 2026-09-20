-- Jarvis — flera bolag, och beredskap för ett CRM.
--
-- Varje affär och fast kostnad hör till ett bolag. Optimera Energi är det
-- första; fler kommer. Dashboarden är därmed per bolag, inte per konto.
--
-- CRM-beredskapen är tre kolumner och ett unikt index, inte en integration:
-- en affär kan bära ett externt id, och samma externa id får bara finnas en
-- gång per bolag. Det är det som gör en framtida synk idempotent — samma
-- affär uppdateras i stället för att dupliceras — och det är allt som behövs
-- i schemat för att ett CRM ska kunna kopplas in senare utan ny migration.
--
-- Tabellerna var tomma när detta kördes (verifierat), därför NOT NULL utan
-- backfill.

create type deal_ursprung as enum ('manuell', 'crm');

-- ------------------------------------------------------------------
-- Bolag
-- ------------------------------------------------------------------

create table companies (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  namn       text not null,
  -- Kortnamn i växlaren, t.ex. "OE". Null → härleds ur namnet i gränssnittet.
  kortnamn   text,
  -- Fritext med flit: formatet skiljer sig mellan bolagsformer och länder.
  orgnr      text,
  aktiv      boolean not null default true,
  created_at timestamptz not null default now(),
  -- Samma bolag ska inte kunna läggas in två gånger av misstag.
  unique (user_id, namn)
);

alter table deals
  add column company_id uuid not null references companies (id) on delete cascade;

alter table fixed_costs
  add column company_id uuid not null references companies (id) on delete cascade;

-- ------------------------------------------------------------------
-- CRM-beredskap
-- ------------------------------------------------------------------

alter table deals
  add column ursprung  deal_ursprung not null default 'manuell',
  add column extern_id text,
  -- När raden senast skrevs av en synk. Null för manuella affärer.
  add column synkad_at timestamptz;

-- Ett externt id hör ihop med ett ursprung: en manuell affär har inget, en
-- CRM-affär måste ha ett. Annars går det inte att veta vilka rader en synk
-- får skriva över.
alter table deals
  add constraint deals_extern_id_foljer_ursprung check (
    (ursprung = 'manuell' and extern_id is null)
    or (ursprung = 'crm' and extern_id is not null)
  );

-- Idempotent synk: samma externa id → samma rad, per bolag.
create unique index deals_extern_id_unik
  on deals (company_id, extern_id)
  where extern_id is not null;

create index on companies (user_id);
create index on deals (user_id, company_id, status);
create index on fixed_costs (user_id, company_id, manad desc);

-- ------------------------------------------------------------------
-- Radnivåsäkerhet
-- ------------------------------------------------------------------

alter table companies enable row level security;
alter table companies force row level security;

create policy companies_agare on companies
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
