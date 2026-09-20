'use client';

import { Block } from 'konsta/react';
import Link from 'next/link';
import { useMemo } from 'react';
import { ColumnChart, Reactor, StackedShare, TIER_COLORS } from '@/components/charts';
import { IconArrowRight } from '@/components/icons';
import Shell from '@/components/Shell';
import { GlassCard, Grid, RuleHeading, StatTile } from '@/components/ui';
import {
  businessByMonth,
  buildInsights,
  flattenItems,
  spendByTier,
  summarize,
  summarizeBusiness,
  weeklyLoad,
  workoutVolume,
} from '@/lib/analytics';
import { useStore } from '@/lib/store';
import { daysAgo, kr, monthLabel, monthLongLabel, num, pct, today } from '@/lib/utils';

/**
 * Huvudskärmen.
 *
 * Rutnätet har ALLTID samma form. En ruta utan underlag visar ett streck och
 * säger rakt ut vad som saknas, i stället för att försvinna eller fyllas med
 * en rimlig siffra. Det är samma regel som gäller i resten av appen, och det
 * är också vad som gör att skärmen ser avsiktlig ut den dagen allt är tomt:
 * en instrumentpanel med nollställda instrument är fortfarande en
 * instrumentpanel. En med hälften av instrumenten borttagna är trasig.
 */
export default function HomePage() {
  const { state, ready, activeCompany } = useStore();
  const manad = today().slice(0, 7);

  /* --- Företag: det aktiva bolaget ---------------------------------- */
  const bolagId = activeCompany?.id;
  const deals = useMemo(
    () => state.deals.filter((d) => d.companyId === bolagId),
    [state.deals, bolagId],
  );
  const fixedCosts = useMemo(
    () => state.fixedCosts.filter((c) => c.companyId === bolagId),
    [state.fixedCosts, bolagId],
  );
  const foretag = useMemo(
    () => summarizeBusiness(deals, fixedCosts, manad),
    [deals, fixedCosts, manad],
  );
  const foretagTotalt = useMemo(() => summarizeBusiness(deals, fixedCosts), [deals, fixedCosts]);
  const manader = useMemo(() => businessByMonth(deals, fixedCosts), [deals, fixedCosts]);
  const harForetag = deals.length > 0 || fixedCosts.length > 0;

  /* --- Kapital ------------------------------------------------------ */
  const portfolj = useMemo(
    () => summarize(state.holdings, state.cashflows),
    [state.holdings, state.cashflows],
  );

  /* --- Mat ---------------------------------------------------------- */
  const senasteKvitton = useMemo(
    () => state.receipts.filter((r) => r.purchasedAt >= daysAgo(30)),
    [state.receipts],
  );
  const matUtgift = senasteKvitton.reduce((a, r) => a + r.total, 0);
  const tiers = useMemo(() => spendByTier(flattenItems(senasteKvitton)), [senasteKvitton]);
  const matInsikt = useMemo(() => buildInsights(state.receipts)[0], [state.receipts]);

  /* --- Kraft -------------------------------------------------------- */
  const senastePass = useMemo(
    () => state.workouts.filter((w) => w.date >= daysAgo(28)),
    [state.workouts],
  );
  const volym = senastePass.reduce((a, w) => a + workoutVolume(w), 0);
  const veckor = useMemo(() => weeklyLoad(state.workouts), [state.workouts]);
  const trend =
    veckor.length >= 2 ? veckor[veckor.length - 1].volume - veckor[veckor.length - 2].volume : 0;

  const moduler = [
    { namn: 'Företag', rader: state.deals.length, href: '/foretag', enhet: 'affärer' },
    { namn: 'Kapital', rader: state.holdings.length, href: '/kapital', enhet: 'innehav' },
    { namn: 'Kvitton', rader: state.receipts.length, href: '/kvitton', enhet: 'kvitton' },
    { namn: 'Kraft', rader: state.workouts.length, href: '/kraft', enhet: 'pass' },
  ];
  const tomt = ready && moduler.every((m) => m.rader === 0);

  return (
    <Shell title="Jarvis" subtitle={halsning()} right={<KontoLank />}>
      <Block className="!mt-0 !mb-0 !px-4 lg:!px-0">
        {/* ── Hero: månadens resultat ─────────────────────────────── */}
        <RuleHeading action={<Pil href="/foretag" />}>
          {monthLongLabel(manad)} · {activeCompany?.namn ?? 'företaget'}
        </RuleHeading>

        <Grid>
          <GlassCard
            hero
            accent
            className="col-span-2 flex flex-col gap-4 p-5 sm:col-span-4 lg:col-span-5 lg:p-7"
          >
            <span className="micro">Resultat denna månad</span>

            {harForetag ? (
              <>
                <span
                  className="tnum text-[38px] leading-[1.02] font-semibold sm:text-[60px]"
                  style={{ color: foretag.resultat >= 0 ? 'var(--accent)' : '#ff6b4a' }}
                >
                  {kr(foretag.resultat)}
                </span>
                <p className="max-w-[46ch] text-[13px] leading-relaxed text-[var(--ink-2)]">
                  Täckningsbidrag {kr(foretag.tb)} minus {kr(foretag.fastaKostnader)} i fasta
                  kostnader. Allt räknat på affärer som stängdes den här månaden.
                </p>
                <div className="hair-t flex flex-wrap gap-x-7 gap-y-3 pt-4">
                  <Mini label="Omsättning" value={kr(foretag.omsattning)} />
                  <Mini
                    label="Täckningsgrad"
                    value={foretag.tg !== undefined ? `${foretag.tg.toFixed(0)} %` : '–'}
                    saknas={foretag.tg === undefined ? 'ingen omsättning' : undefined}
                  />
                  <Mini label="Vunna affärer" value={String(foretag.antalVunna)} />
                </div>

                <div className="hair-t pt-5">
                  <span className="micro">Nollpunkt</span>
                  <div className="mt-3">
                    <Reactor tb={foretag.tb} fasta={foretag.fastaKostnader} format={(n) => kr(n)} />
                  </div>
                </div>
              </>
            ) : (
              <Saknas
                stort
                text={
                  activeCompany ? `Inga affärer i ${activeCompany.namn}` : 'Inga affärer inlagda'
                }
                forklaring="Lägg in en affär med värde och rörlig kostnad, så räknas täckningsbidrag, täckningsgrad och resultat ut härifrån."
                href="/foretag"
                lank="Öppna Företag"
              />
            )}
          </GlassCard>

          <GlassCard accent className="col-span-2 flex flex-col gap-4 sm:col-span-4 lg:col-span-7">
            <span className="micro">Säljläget</span>
            <div className="grid grid-cols-2 content-start gap-x-4 gap-y-5 sm:gap-x-6">
              <Kpi
                label="Pipeline"
                value={deals.length > 0 ? kr(foretagTotalt.pipeline) : '–'}
                sub={
                  deals.length > 0
                    ? `Viktat ${kr(foretagTotalt.viktadPipeline)}`
                    : 'Inga öppna affärer'
                }
              />
              <Kpi
                label="Vinstfrekvens"
                value={
                  foretagTotalt.vinstfrekvens !== undefined
                    ? `${foretagTotalt.vinstfrekvens.toFixed(0)} %`
                    : '–'
                }
                sub={
                  foretagTotalt.vinstfrekvens !== undefined
                    ? `${foretagTotalt.antalVunna} vunna · ${foretagTotalt.antalForlorade} förlorade`
                    : 'Inga avgjorda affärer'
                }
              />
              <Kpi
                label="Snittaffär"
                value={foretagTotalt.snittaffar !== undefined ? kr(foretagTotalt.snittaffar) : '–'}
                sub={
                  foretagTotalt.snittaffar !== undefined
                    ? `Över ${foretagTotalt.antalVunna} vunna`
                    : 'Kräver en vunnen affär'
                }
              />
              <Kpi
                label="Säljcykel"
                value={
                  foretagTotalt.saljcykelDagar !== undefined
                    ? `${num(foretagTotalt.saljcykelDagar)} d`
                    : '–'
                }
                sub={
                  foretagTotalt.saljcykelDagar !== undefined
                    ? 'Median, öppnad till stängd'
                    : 'Kräver en vunnen affär'
                }
              />
            </div>
            {foretagTotalt.pipelineUtanSannolikhet > 0 && (
              <p className="hair-t pt-3 text-[11px] leading-relaxed text-[var(--ink-3)]">
                {kr(foretagTotalt.pipelineUtanSannolikhet)} av pipelinen saknar satt sannolikhet och
                ingår inte i den viktade siffran
                {foretagTotalt.pipelineUtanSannolikhetAntal > 0 &&
                  ` (${foretagTotalt.pipelineUtanSannolikhetAntal} st)`}
                .
              </p>
            )}

            {manader.length >= 2 && (
              <div className="hair-t pt-4">
                <span className="micro">Resultat per månad</span>
                <div className="mt-3">
                  <ColumnChart
                    data={manader.map((m) => ({ label: monthLabel(m.manad), value: m.resultat }))}
                    format={(n) => kr(n)}
                    height={104}
                  />
                </div>
              </div>
            )}
          </GlassCard>
        </Grid>

        {/* ── Kapital + Kraft ─────────────────────────────────────── */}
        <RuleHeading action={<Pil href="/kapital" />}>Kapital</RuleHeading>
        <Grid>
          <StatTile
            label="Marknadsvärde"
            value={state.holdings.length > 0 ? kr(portfolj.marketValue) : '–'}
            hint={
              state.holdings.length > 0
                ? `${state.holdings.length} innehav · anskaffat ${kr(portfolj.costBasis)}`
                : 'Inga innehav inlagda'
            }
            emphasis="stor"
            className="col-span-2 sm:col-span-2 lg:col-span-4"
          />
          <StatTile
            label="Orealiserat"
            value={state.holdings.length > 0 ? kr(portfolj.gain) : '–'}
            delta={state.holdings.length > 0 ? pct(portfolj.gainPct) : undefined}
            tone={portfolj.gain >= 0 ? 'up' : 'down'}
            hint={
              portfolj.unpricedCount > 0
                ? `${portfolj.unpricedCount} innehav saknar kurs och räknas till anskaffningsvärde`
                : undefined
            }
            emphasis="stor"
            className="col-span-2 sm:col-span-2 lg:col-span-4"
          />
          <StatTile
            label="Insatt kapital"
            value={portfolj.deposited > 0 ? kr(portfolj.deposited) : '–'}
            hint={
              portfolj.deposited > 0
                ? `Uttaget ${kr(portfolj.withdrawn)} · utdelat ${kr(portfolj.dividends)}`
                : 'Inga kassaflöden registrerade'
            }
            emphasis="stor"
            className="col-span-2 sm:col-span-4 lg:col-span-4"
          />
        </Grid>

        <div data-tron="rod">
          <RuleHeading action={<Pil href="/kraft" />}>Kraft · fyra veckor</RuleHeading>
          <Grid>
            <StatTile
              label="Volym"
              value={senastePass.length > 0 ? `${num(volym / 1000, 1)} ton` : '–'}
              delta={
                trend !== 0 ? `${trend > 0 ? '+' : ''}${num(trend)} kg mot förra veckan` : undefined
              }
              tone={trend > 0 ? 'up' : trend < 0 ? 'down' : 'neutral'}
              hint={senastePass.length === 0 ? 'Inga pass loggade' : undefined}
              emphasis="stor"
              className="col-span-1 sm:col-span-2 lg:col-span-4"
            />
            <StatTile
              label="Pass"
              value={senastePass.length > 0 ? String(senastePass.length) : '–'}
              hint={
                senastePass.length > 0
                  ? `${(senastePass.length / 4).toFixed(1)} per vecka`
                  : 'Logga ett pass för att starta kurvan'
              }
              emphasis="stor"
              className="col-span-1 sm:col-span-2 lg:col-span-4"
            />
            <GlassCard className="col-span-2 sm:col-span-4 lg:col-span-4">
              <span className="micro">Veckobelastning</span>
              <div className="mt-3">
                <ColumnChart
                  data={veckor.slice(-8).map((v) => ({ label: v.week, value: v.volume }))}
                  format={(n) => `${num(n)} kg`}
                  height={76}
                />
              </div>
            </GlassCard>
          </Grid>
        </div>

        {/* ── Mat ─────────────────────────────────────────────────── */}
        <div data-tron="rod">
          <RuleHeading action={<Pil href="/kvitton" />}>Mat · 30 dagar</RuleHeading>
          <Grid>
            <StatTile
              label="Utgift"
              value={senasteKvitton.length > 0 ? kr(matUtgift) : '–'}
              hint={
                senasteKvitton.length > 0
                  ? `${senasteKvitton.length} kvitton`
                  : 'Inga kvitton de senaste 30 dagarna'
              }
              emphasis="stor"
              className="col-span-2 sm:col-span-2 lg:col-span-4"
            />
            <GlassCard className="col-span-2 sm:col-span-2 lg:col-span-8">
              <span className="micro">Vart matpengarna går</span>
              <div className="mt-3">
                {/* Divergerande skala: appens två poler med neutral mitt.
                  Segmenten är direktmärkta — färgen bär aldrig ensam. */}
                <StackedShare
                  segments={[
                    { label: 'Satsa på', value: tiers.satsa, color: TIER_COLORS.satsa },
                    { label: 'Neutralt', value: tiers.neutral, color: TIER_COLORS.neutral },
                    { label: 'Skär ner', value: tiers['skar-ner'], color: TIER_COLORS['skar-ner'] },
                  ]}
                  format={(n) => kr(n)}
                />
              </div>
            </GlassCard>
          </Grid>
        </div>

        {matInsikt && (
          <>
            <RuleHeading>Slutsats</RuleHeading>
            <GlassCard accent className="space-y-1.5">
              <h3 className="text-[16px] leading-snug font-semibold text-white">
                {matInsikt.title}
              </h3>
              <p className="text-[14px] leading-relaxed text-[var(--ink-2)]">{matInsikt.body}</p>
            </GlassCard>
          </>
        )}

        {/* ── Systemstatus ────────────────────────────────────────── */}
        <RuleHeading>Systemstatus</RuleHeading>
        <GlassCard className="!p-0 overflow-hidden">
          <ul className="divide-y divide-[var(--hair)]">
            {moduler.map((m) => (
              <li key={m.href}>
                <Link
                  href={m.href}
                  className="flex items-center gap-3 px-4 py-3.5 transition-colors duration-150 active:bg-white/[0.05] lg:hover:bg-white/[0.04]"
                >
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{
                      background: m.rader > 0 ? 'var(--accent)' : 'var(--ink-3)',
                      boxShadow: m.rader > 0 ? '0 0 8px 0 rgb(var(--accent-rgb) / 0.9)' : 'none',
                    }}
                  />
                  <span className="flex-1 text-[15px] text-white">{m.namn}</span>
                  <span className="tnum text-[13px] text-[var(--ink-2)]">
                    {m.rader > 0 ? `${m.rader} ${m.enhet}` : 'tom'}
                  </span>
                  <IconArrowRight className="w-4 h-4 text-[var(--ink-3)]" />
                </Link>
              </li>
            ))}
          </ul>
        </GlassCard>

        {tomt && (
          <p className="px-1 pt-4 pb-2 text-[13px] leading-relaxed text-[var(--ink-3)]">
            Allt är tomt än. Instrumenten står kvar ändå — de visar streck där siffran saknas i
            stället för att gissa, och fylls i takt med att du matar in något. Börja var du vill.
          </p>
        )}
      </Block>
    </Shell>
  );
}

/* ------------------------------------------------------------------ */

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="micro !text-[10px]">{label}</span>
      <span className="tnum text-[20px] leading-tight font-semibold text-white sm:text-[24px]">
        {value}
      </span>
      <span className="text-[11px] leading-snug text-[var(--ink-3)]">{sub}</span>
    </div>
  );
}

function Mini({ label, value, saknas }: { label: string; value: string; saknas?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="micro !text-[10px]">{label}</span>
      <span className="tnum text-[17px] font-semibold text-white">{value}</span>
      {saknas && <span className="text-[10px] text-[var(--ink-3)]">{saknas}</span>}
    </div>
  );
}

/** Tom ruta som säger vad som saknas, inte en ruta som försvunnit. */
function Saknas({
  text,
  forklaring,
  href,
  lank,
  stort = false,
}: {
  text: string;
  forklaring?: string;
  href: string;
  lank: string;
  stort?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span
        className={`tnum font-semibold text-[var(--ink-3)] ${stort ? 'text-[44px] leading-none sm:text-[60px]' : 'text-[30px] leading-tight'}`}
      >
        –
      </span>
      <span className="text-[14px] text-[var(--ink-2)]">{text}</span>
      {forklaring && (
        <p className="max-w-[46ch] text-[12px] leading-relaxed text-[var(--ink-3)]">{forklaring}</p>
      )}
      <Link
        href={href}
        className="mt-1 inline-flex items-center gap-1.5 text-[13px] font-medium"
        style={{ color: 'var(--accent)' }}
      >
        {lank}
        <IconArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

function Pil({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="shrink-0 text-[12px] font-semibold tracking-[0.08em] uppercase"
      style={{ color: 'var(--accent)' }}
    >
      Öppna
    </Link>
  );
}

function KontoLank() {
  return (
    <Link href="/konto" className="p-2 text-[15px] font-medium" style={{ color: 'var(--accent)' }}>
      Konto
    </Link>
  );
}

function halsning(): string {
  const hour = new Date().getHours();
  if (hour < 5) return 'Sent uppe.';
  if (hour < 10) return 'God morgon.';
  if (hour < 14) return 'God förmiddag.';
  if (hour < 18) return 'God eftermiddag.';
  if (hour < 23) return 'God kväll.';
  return 'Sent uppe.';
}
