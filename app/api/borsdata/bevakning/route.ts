import {
  blankningsstatistik,
  borsapiFel,
  insynsstatistik,
  kommandeRapporter,
  kvot,
  type Kalenderhandelse,
} from '@/lib/borsapi';
import { requireUser } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

interface Bevakning {
  bolagId: string;
  nastaRapport: { datum: string; typ: string; period: string | null; bekraftat: boolean } | null;
  insyn: { koper: number; saljer: number; nettoSek: number; vdNettoSek: number } | null;
  blankning: { andel: number; antalPositioner: number; senast: string | null } | null;
  fel: string | null;
}

/**
 * Samlar allt BörsAPI vet om innehaven som är kopplade till ett bolag.
 *
 * De tre anropen per bolag är gratis hos BörsAPI (0 kvotförbrukning), så
 * kostnaden är latens, inte kvot. Därför körs de parallellt och ett fel på
 * ett bolag fäller inte de andra — ett innehav utan data är bättre än en tom
 * sida.
 */
export async function POST(request: Request) {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const body = (await request.json()) as { bolagIds?: string[] };
    const ids = [...new Set(body.bolagIds ?? [])].filter(Boolean).slice(0, 25);

    if (ids.length === 0) {
      return Response.json(
        {
          error: 'inga_bolag',
          message: 'Inget innehav är kopplat till ett bolag hos BörsAPI ännu.',
        },
        { status: 400 },
      );
    }

    const bevakningar = await Promise.all(ids.map((id) => samlaFor(id)));
    const kvotstatus = await kvot().catch(() => null);

    return Response.json({ bevakningar, kvot: kvotstatus });
  } catch (error) {
    return borsapiFel(error);
  }
}

async function samlaFor(bolagId: string): Promise<Bevakning> {
  const [rapporter, insyn, blankning] = await Promise.allSettled([
    kommandeRapporter(bolagId),
    insynsstatistik(bolagId),
    blankningsstatistik(bolagId),
  ]);

  const idag = new Date().toISOString().slice(0, 10);
  const nasta =
    rapporter.status === 'fulfilled'
      ? rapporter.value
          .filter((r: Kalenderhandelse) => r.event_date >= idag)
          .sort((a, b) => a.event_date.localeCompare(b.event_date))[0]
      : undefined;

  // 90 dagar är kompromissen: 30 blir brus av en enskild transaktion,
  // 365 jämnar ut allt som faktiskt säger något.
  const period = insyn.status === 'fulfilled' ? insyn.value.statistics['90d'] : undefined;
  const blank = blankning.status === 'fulfilled' ? blankning.value.statistics : undefined;

  const fel = [rapporter, insyn, blankning]
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map((r) => (r.reason instanceof Error ? r.reason.message : String(r.reason)))[0];

  return {
    bolagId,
    nastaRapport: nasta
      ? {
          datum: nasta.event_date,
          typ: nasta.event_type,
          period: nasta.period,
          bekraftat: nasta.is_confirmed,
        }
      : null,
    insyn: period
      ? {
          koper: period.buy_count,
          saljer: period.sell_count,
          nettoSek: period.net_value_sek,
          vdNettoSek: period.ceo_net_value_sek,
        }
      : null,
    blankning: blank
      ? {
          andel: blank.total_short_percentage,
          antalPositioner: blank.active_positions_count,
          senast: blank.latest_position_date,
        }
      : null,
    fel: fel ?? null,
  };
}
