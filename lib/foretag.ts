import type { CostCategory, DealStatus } from './types';

/**
 * Visningsnamn för företagsmodulen.
 *
 * Enum-värdena i databasen saknar å, ä och ö — samma konvention som
 * food_category — medan etiketterna här är korrekt svenska. Separationen
 * gör att en stavning kan ändras utan en migration.
 */
export const STATUS_META: Record<
  DealStatus,
  { label: string; hint: string; oppen: boolean; vunnen: boolean }
> = {
  lead: {
    label: 'Lead',
    hint: 'Identifierad, inget lämnat än',
    oppen: true,
    vunnen: false,
  },
  offert: {
    label: 'Offert',
    hint: 'Offert lämnad, väntar svar',
    oppen: true,
    vunnen: false,
  },
  forhandling: {
    label: 'Förhandling',
    hint: 'Pris eller omfattning diskuteras',
    oppen: true,
    vunnen: false,
  },
  vunnen: {
    label: 'Vunnen',
    hint: 'Klar men inte fakturerad — pengarna har inte kommit in',
    oppen: false,
    vunnen: true,
  },
  fakturerad: {
    label: 'Fakturerad',
    hint: 'Fakturan är skickad',
    oppen: false,
    vunnen: true,
  },
  forlorad: {
    label: 'Förlorad',
    hint: 'Gick till någon annan eller blev inte av',
    oppen: false,
    vunnen: false,
  },
};

export const COST_META: Record<CostCategory, string> = {
  loner: 'Löner',
  lokal: 'Lokal',
  fordon: 'Fordon',
  verktyg: 'Verktyg',
  forsakring: 'Försäkring',
  marknadsforing: 'Marknadsföring',
  system: 'System & licenser',
  redovisning: 'Redovisning',
  ovrigt: 'Övrigt',
};
