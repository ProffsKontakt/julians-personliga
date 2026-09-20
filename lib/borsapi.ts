/**
 * Klient mot borsapi.se.
 *
 * VIKTIGT OM VAD DEN HÄR KÄLLAN GÖR OCH INTE GÖR
 *
 * BörsAPI levererar *fundamenta och händelser* om svenska bolag: rapporter,
 * rapportkalender, insynshandel och blankningspositioner. Den levererar
 * INGA aktiekurser. Hela OpenAPI-specen saknar pris-, kurs- och
 * börsvärdesfält — bolagsobjektet är namn, ticker, ISIN, sektor och
 * noteringsstatus, inget mer.
 *
 * Kursen till portföljvärderingen kommer alltså fortfarande från manuell
 * inmatning eller Finnhub. Det här lagret svarar på en annan fråga:
 * "vad händer i bolagen jag äger?"
 *
 * Kvot: gratisnivån har ett tak på antal anrop. Kalender, insynsstatistik och
 * blankningsstatistik är gratis (0 kvotförbrukning), medan bolagssökning
 * kostar. Därför cachas sökningar hårt och görs bara på användarens initiativ.
 */

const BAS = 'https://borsapi.se';

export class SaknarBorsapiNyckel extends Error {
  constructor() {
    super('BORSDATA_API_KEY saknas');
    this.name = 'SaknarBorsapiNyckel';
  }
}

export interface Bolag {
  id: string;
  name: string;
  ticker: string | null;
  isin: string | null;
  sector: string | null;
  is_active: boolean;
}

export interface Kalenderhandelse {
  id: string;
  company_id: string;
  ticker: string | null;
  company_name: string;
  event_type: string;
  event_date: string;
  period: string | null;
  is_confirmed: boolean;
}

export interface Insynsperiod {
  buy_count: number;
  sell_count: number;
  net_quantity: number;
  net_value_sek: number;
  ceo_net_value_sek: number;
}

export interface Insynsstatistik {
  company_id: string;
  ticker: string | null;
  name: string;
  statistics: {
    '30d'?: Insynsperiod;
    '90d'?: Insynsperiod;
    '365d'?: Insynsperiod;
  };
}

export interface Blankningsstatistik {
  company_id: string;
  ticker: string | null;
  name: string;
  statistics: {
    total_short_percentage: number;
    active_positions_count: number;
    latest_position_date: string | null;
    active_positions: { holder_name: string; percentage: number; position_date: string }[];
  };
}

export interface Kvot {
  plan_type: string;
  is_lifetime: boolean;
  limit: number;
  used: number;
  remaining: number;
}

async function hamta<T>(
  vag: string,
  params: Record<string, string | number | undefined> = {},
  revalidate = 3600,
): Promise<T> {
  const nyckel = process.env.BORSDATA_API_KEY;
  if (!nyckel) throw new SaknarBorsapiNyckel();

  const url = new URL(BAS + vag);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
  }

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${nyckel}`, Accept: 'application/json' },
    next: { revalidate },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`BörsAPI svarade ${res.status}${text ? `: ${text.slice(0, 200)}` : ''}`);
  }

  return (await res.json()) as T;
}

/** Bolagssökning. Kostar kvot — cacha länge och anropa bara på användarens initiativ. */
export async function sokBolag(fraga: string, limit = 10): Promise<Bolag[]> {
  const svar = await hamta<{ data: Bolag[] }>(
    '/api/v1/companies',
    { search: fraga, limit },
    60 * 60 * 24,
  );
  return svar.data ?? [];
}

/** Rapportkalender för ett bolag. Gratis hos BörsAPI. */
export async function kommandeRapporter(bolagId: string): Promise<Kalenderhandelse[]> {
  const svar = await hamta<{ data: Kalenderhandelse[] }>(
    `/api/v1/companies/${bolagId}/calendar`,
    { order: 'asc' },
    60 * 60 * 6,
  );
  return svar.data ?? [];
}

export function insynsstatistik(bolagId: string): Promise<Insynsstatistik> {
  return hamta<Insynsstatistik>(`/api/v1/companies/${bolagId}/insider-statistics`, {}, 60 * 60 * 6);
}

export function blankningsstatistik(bolagId: string): Promise<Blankningsstatistik> {
  return hamta<Blankningsstatistik>(
    `/api/v1/companies/${bolagId}/short-statistics`,
    {},
    60 * 60 * 6,
  );
}

/** Kontrollerar nyckeln och returnerar kvarvarande kvot. */
export async function kvot(): Promise<Kvot> {
  const svar = await hamta<{ usage: Kvot }>('/api/v1/test', {}, 60 * 5);
  return svar.usage;
}

/** Enhetligt felsvar på svenska, i samma stil som lib/anthropic.ts. */
export function borsapiFel(error: unknown): Response {
  if (error instanceof SaknarBorsapiNyckel) {
    return Response.json(
      {
        error: 'saknar_nyckel',
        message:
          'BORSDATA_API_KEY är inte satt. Lägg den i Vercels environment variables och deploya om.',
      },
      { status: 503 },
    );
  }
  const message = error instanceof Error ? error.message : 'Okänt fel mot BörsAPI.';
  return Response.json({ error: 'borsapi_fel', message }, { status: 502 });
}
