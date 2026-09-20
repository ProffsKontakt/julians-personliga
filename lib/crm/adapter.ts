import type { Deal, DealStatus } from '@/lib/types';

/**
 * Kontraktet ett CRM måste uppfylla för att kunna kopplas in.
 *
 * Det finns ingen integration än — bara den här ytan och de tre kolumner i
 * `deals` som gör en synk möjlig (`ursprung`, `extern_id`, `synkad_at`).
 * Den dag ett CRM ansluts skrivs en adapter mot det här gränssnittet, och
 * en serverrutt under `/api/crm/` (bakom `requireUser()`, som allt annat
 * som kostar) anropar `hamtaAffarer()` och skriver resultatet till `deals`
 * med `ursprung = 'crm'`.
 *
 * Reglerna som gör det ofarligt att koppla in ett CRM senare:
 *
 *  1. Synken är idempotent. Samma `externId` inom samma bolag träffar samma
 *     rad — det garanteras av ett unikt index i databasen. En körning två
 *     gånger ger samma resultat som en gång.
 *  2. Appen skriver aldrig en CRM-affär. Gränssnittet visar den men låser
 *     redigering, annars skrivs ändringen över vid nästa synk och användaren
 *     tror att hen sparat något.
 *  3. Det CRM:et inte vet lämnas tomt. En affär utan sannolikhet i CRM:et
 *     får `sannolikhet: undefined` här — inte en gissad procentsats. Samma
 *     regel som i resten av appen.
 *  4. Nycklar till CRM:et stannar på servern. Adaptern körs aldrig i
 *     webbläsaren.
 */
export interface ExternAffar {
  /** CRM:ets egen identitet. Måste vara stabil mellan körningar. */
  externId: string;
  kund: string;
  titel: string;
  status: DealStatus;
  varde: number;
  rorligKostnad: number;
  sannolikhet?: number;
  oppnad: string;
  stangd?: string;
  kalla?: string;
}

export interface CrmAdapter {
  /** Mänskligt namn, för loggar och gränssnitt: "HubSpot", "Pipedrive" … */
  readonly namn: string;
  /**
   * Hämtar alla affärer CRM:et känner till för ett bolag. Adaptern ansvarar
   * för att översätta CRM:ets statusar till appens — och för att lämna
   * `undefined` där CRM:et saknar uppgift.
   */
  hamtaAffarer(bolag: { id: string; namn: string; orgnr?: string }): Promise<ExternAffar[]>;
}

/** Bygger raden som ska skrivas till `deals` ur en extern affär. */
export function tillDeal(
  extern: ExternAffar,
  companyId: string,
  nu: string,
): Omit<Deal, 'id' | 'createdAt'> {
  return {
    companyId,
    kund: extern.kund,
    titel: extern.titel,
    status: extern.status,
    varde: extern.varde,
    rorligKostnad: extern.rorligKostnad,
    sannolikhet: extern.sannolikhet,
    oppnad: extern.oppnad,
    stangd: extern.stangd,
    kalla: extern.kalla,
    ursprung: 'crm',
    externId: extern.externId,
    synkadAt: nu,
  };
}
