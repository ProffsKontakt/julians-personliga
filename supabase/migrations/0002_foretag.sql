-- Jarvis — företagsmodulen.
--
-- Två tabeller, en distinktion: affärernas rörliga kostnader försvinner om
-- affären inte blir av, de fasta kostnaderna löper ändå. Det är precis den
-- skillnaden som gör täckningsbidraget meningsfullt — utan den går det inte
-- att svara på om en vunnen affär faktiskt bar sina egna kostnader.
--
-- Samma ägarregel som resten av schemat: user_id, RLS med force, policy mot
-- auth.uid(), allt i samma migration som tabellerna skapas.

-- ------------------------------------------------------------------
-- Uppräkningar. Speglar lib/types.ts — ändras de där ska de ändras här.
-- Samma konvention som food_category: inga å/ä/ö i enum-värdena.
-- ------------------------------------------------------------------

create type deal_status as enum (
  'lead', 'offert', 'forhandling', 'vunnen', 'fakturerad', 'forlorad'
);

create type cost_category as enum (
  'loner', 'lokal', 'fordon', 'verktyg', 'forsakring',
  'marknadsforing', 'system', 'redovisning', 'ovrigt'
);

-- ------------------------------------------------------------------
-- Affärer
-- ------------------------------------------------------------------

create table deals (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  kund           text not null,
  titel          text not null,
  status         deal_status not null default 'lead',
  -- Exklusive moms. Momsen är aldrig bolagets pengar.
  varde          numeric(14, 2) not null check (varde >= 0),
  -- Material, underentreprenör, installationstid. Allt som bara uppstår
  -- om affären blir av.
  rorlig_kostnad numeric(14, 2) not null default 0 check (rorlig_kostnad >= 0),
  -- Null betyder att sannolikheten aldrig satts. Viktad pipeline hoppar då
  -- över affären i stället för att anta en siffra.
  sannolikhet    smallint check (sannolikhet is null or (sannolikhet between 0 and 100)),
  oppnad         date not null default current_date,
  stangd         date,
  kalla          text,
  note           text,
  created_at     timestamptz not null default now(),

  -- En stängd affär måste ha ett stängningsdatum, och en öppen får inte ha
  -- ett. Annars blir säljcykeln tyst fel i stället för synligt saknad.
  constraint deals_stangd_foljer_status check (
    (status in ('vunnen', 'fakturerad', 'forlorad') and stangd is not null)
    or (status in ('lead', 'offert', 'forhandling') and stangd is null)
  ),
  constraint deals_stangd_efter_oppnad check (stangd is null or stangd >= oppnad)
);

-- Täckningsbidrag som genererad kolumn: kan inte hamna i otakt med värdet
-- eller kostnaden, och går att sortera och indexera på direkt.
alter table deals
  add column tb numeric(14, 2)
  generated always as (varde - rorlig_kostnad) stored;

-- ------------------------------------------------------------------
-- Fasta kostnader
-- ------------------------------------------------------------------

create table fixed_costs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  -- Månaden kostnaden hör till, lagrad som 'YYYY-MM'. Ett datum hade antytt
  -- en precision som inte finns: en hyra hör till mars, inte till 1 mars.
  manad      text not null check (manad ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  kategori   cost_category not null default 'ovrigt',
  belopp     numeric(14, 2) not null check (belopp >= 0),
  note       text,
  created_at timestamptz not null default now()
);

create index on deals (user_id, status);
create index on deals (user_id, stangd desc);
create index on deals (user_id, oppnad desc);
create index on fixed_costs (user_id, manad desc);

-- ------------------------------------------------------------------
-- Radnivåsäkerhet
-- ------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['deals', 'fixed_costs']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);

    execute format($f$
      create policy %I on %I
        for all
        to authenticated
        using (user_id = (select auth.uid()))
        with check (user_id = (select auth.uid()))
    $f$, t || '_agare', t);
  end loop;
end $$;
