'use client';

import { Block, Button, Sheet } from 'konsta/react';
import { useMemo, useState } from 'react';
import { BarList, ColumnChart } from '@/components/charts';
import { IconPlus, IconTrash, IconWarning } from '@/components/icons';
import Shell from '@/components/Shell';
import {
  Chip,
  EmptyState,
  GlassCard,
  Grid,
  Row,
  RuleHeading,
  StatTile,
  Tabs,
} from '@/components/ui';
import {
  businessByMonth,
  isOpen,
  pipelineByStatus,
  summarizeBusiness,
  tb,
  tg,
} from '@/lib/analytics';
import { COST_META, STATUS_META } from '@/lib/foretag';
import { useStore } from '@/lib/store';
import {
  COST_CATEGORIES,
  DEAL_STATUSES,
  type CostCategory,
  type Deal,
  type DealStatus,
  type FixedCost,
} from '@/lib/types';
import { kr, monthLabel, monthLongLabel, num, today, uid } from '@/lib/utils';

type View = 'oversikt' | 'affarer' | 'kostnader';

export default function ForetagPage() {
  const { state, ready, saveDeal, removeDeal, saveFixedCost, removeFixedCost, error } = useStore();
  const [view, setView] = useState<View>('oversikt');
  const [dealOpen, setDealOpen] = useState(false);
  const [editing, setEditing] = useState<Deal | undefined>();
  const [costOpen, setCostOpen] = useState(false);

  const manad = today().slice(0, 7);
  const period = useMemo(
    () => summarizeBusiness(state.deals, state.fixedCosts, manad),
    [state.deals, state.fixedCosts, manad],
  );
  const totalt = useMemo(
    () => summarizeBusiness(state.deals, state.fixedCosts),
    [state.deals, state.fixedCosts],
  );
  const manader = useMemo(
    () => businessByMonth(state.deals, state.fixedCosts),
    [state.deals, state.fixedCosts],
  );

  const tomt = state.deals.length === 0 && state.fixedCosts.length === 0;

  return (
    <Shell
      title="Företag"
      subtitle={
        ready ? `${state.deals.length} affärer · ${kr(totalt.omsattning)} omsatt` : 'Läser…'
      }
      right={
        <button
          onClick={() => {
            setEditing(undefined);
            setDealOpen(true);
          }}
          className="p-2"
          style={{ color: 'var(--accent)' }}
          aria-label="Lägg till affär"
        >
          <IconPlus className="w-6 h-6" />
        </button>
      }
    >
      <Block className="!mt-3 !mb-0 !px-4 lg:!px-0">
        <Tabs
          value={view}
          onChange={setView}
          options={
            [
              ['oversikt', 'Översikt'],
              ['affarer', 'Affärer'],
              ['kostnader', 'Kostnader'],
            ] as const
          }
        />

        {error && (
          <GlassCard className="mt-3 flex items-start gap-3">
            <IconWarning className="w-5 h-5 shrink-0 text-[#ff6b4a]" />
            <p className="text-[14px] leading-relaxed text-[var(--ink-2)]">{error}</p>
          </GlassCard>
        )}
      </Block>

      {tomt ? (
        <Block className="!mt-6 !px-4 lg:!px-0">
          <EmptyState
            title="Inga affärer än"
            body="Lägg in en affär med värde och rörlig kostnad — material, underentreprenör, installationstid. Täckningsbidraget räknas ut därifrån. Fasta kostnader läggs in per månad och dras av först på resultatraden, för det är den skillnaden som gör TB meningsfullt."
            action={
              <Button rounded className="btn-tron mt-2" onClick={() => setDealOpen(true)}>
                Lägg in första affären
              </Button>
            }
          />
        </Block>
      ) : (
        <Block className="!mt-0 !mb-0 !px-4 lg:!px-0">
          {view === 'oversikt' && (
            <Oversikt
              period={period}
              totalt={totalt}
              manader={manader}
              deals={state.deals}
              manad={manad}
            />
          )}
          {view === 'affarer' && (
            <Affarer
              deals={state.deals}
              onEdit={(d) => {
                setEditing(d);
                setDealOpen(true);
              }}
              onRemove={(id) => void removeDeal(id)}
            />
          )}
          {view === 'kostnader' && (
            <Kostnader
              costs={state.fixedCosts}
              onRemove={(id) => void removeFixedCost(id)}
              onAdd={() => setCostOpen(true)}
            />
          )}
        </Block>
      )}

      <DealForm
        key={editing?.id ?? 'ny'}
        opened={dealOpen}
        initial={editing}
        onClose={() => {
          setDealOpen(false);
          setEditing(undefined);
        }}
        onSave={(d) => {
          void saveDeal(d);
          setDealOpen(false);
          setEditing(undefined);
        }}
      />

      <CostForm
        opened={costOpen}
        onClose={() => setCostOpen(false)}
        onSave={(c) => {
          void saveFixedCost(c);
          setCostOpen(false);
        }}
      />
    </Shell>
  );
}

/* ------------------------------------------------------------------ */

function Oversikt({
  period,
  totalt,
  manader,
  deals,
  manad,
}: {
  period: ReturnType<typeof summarizeBusiness>;
  totalt: ReturnType<typeof summarizeBusiness>;
  manader: ReturnType<typeof businessByMonth>;
  deals: Deal[];
  manad: string;
}) {
  const pipeline = useMemo(() => pipelineByStatus(deals), [deals]);

  return (
    <>
      <RuleHeading>{monthLongLabel(manad)}</RuleHeading>
      <Grid>
        <GlassCard
          hero
          accent
          className="col-span-2 flex flex-col gap-3 p-5 sm:col-span-4 lg:col-span-6 lg:p-7"
        >
          <span className="micro">Resultat</span>
          <span
            className="tnum text-[38px] leading-[1.02] font-semibold sm:text-[56px]"
            style={{ color: period.resultat >= 0 ? 'var(--accent)' : '#ff6b4a' }}
          >
            {kr(period.resultat)}
          </span>
          <p className="max-w-[46ch] text-[13px] leading-relaxed text-[var(--ink-2)]">
            Täckningsbidrag {kr(period.tb)} minus {kr(period.fastaKostnader)} fasta kostnader.
            {period.ejFakturerat > 0 &&
              ` ${kr(period.ejFakturerat)} är vunnet men ännu inte fakturerat.`}
          </p>
        </GlassCard>

        <StatTile
          label="Omsättning"
          value={kr(period.omsattning)}
          hint={`${period.antalVunna} vunna affärer`}
          emphasis="stor"
          className="col-span-2 sm:col-span-2 lg:col-span-3"
        />
        <StatTile
          label="Täckningsgrad"
          value={period.tg !== undefined ? `${period.tg.toFixed(0)} %` : '–'}
          hint={period.tg === undefined ? 'Kräver omsättning' : `TB ${kr(period.tb)}`}
          emphasis="stor"
          className="col-span-2 sm:col-span-2 lg:col-span-3"
        />
      </Grid>

      <RuleHeading>Hela tiden</RuleHeading>
      <Grid>
        <StatTile
          label="Snittaffär"
          value={totalt.snittaffar !== undefined ? kr(totalt.snittaffar) : '–'}
          hint={totalt.snittaffar === undefined ? 'Inga vunna affärer' : undefined}
          className="col-span-1 sm:col-span-2 lg:col-span-3"
        />
        <StatTile
          label="Vinstfrekvens"
          value={totalt.vinstfrekvens !== undefined ? `${totalt.vinstfrekvens.toFixed(0)} %` : '–'}
          hint={
            totalt.vinstfrekvens === undefined
              ? 'Inga avgjorda affärer'
              : `${totalt.antalVunna} / ${totalt.antalVunna + totalt.antalForlorade}`
          }
          className="col-span-1 sm:col-span-2 lg:col-span-3"
        />
        <StatTile
          label="Säljcykel"
          value={totalt.saljcykelDagar !== undefined ? `${num(totalt.saljcykelDagar)} d` : '–'}
          hint={totalt.saljcykelDagar === undefined ? 'Kräver vunna affärer' : 'Median'}
          className="col-span-1 sm:col-span-2 lg:col-span-3"
        />
        <StatTile
          label="Ej fakturerat"
          value={kr(totalt.ejFakturerat)}
          hint="Vunnet men inte skickat"
          className="col-span-1 sm:col-span-2 lg:col-span-3"
        />
      </Grid>

      <RuleHeading>Pipeline</RuleHeading>
      <GlassCard>
        <BarList
          data={pipeline.map((p) => ({
            label: STATUS_META[p.status].label,
            value: p.value,
            formatted: kr(p.value),
            meta: `${p.count} st`,
          }))}
          emptyLabel="Inga öppna affärer"
        />
        {totalt.pipelineUtanSannolikhet > 0 && (
          <p className="hair-t mt-4 pt-3 text-[12px] leading-relaxed text-[var(--ink-3)]">
            {kr(totalt.pipelineUtanSannolikhet)} av pipelinen saknar satt sannolikhet och ingår
            därför inte i den viktade siffran ({kr(totalt.viktadPipeline)}). En gissad procentsats
            hade sett mer komplett ut och varit mindre sann.
          </p>
        )}
      </GlassCard>

      {manader.length >= 2 && (
        <>
          <RuleHeading>Resultat per månad</RuleHeading>
          <GlassCard>
            <ColumnChart
              data={manader.map((m) => ({ label: monthLabel(m.manad), value: m.resultat }))}
              format={(n) => kr(n)}
            />
          </GlassCard>
        </>
      )}
    </>
  );
}

function Affarer({
  deals,
  onEdit,
  onRemove,
}: {
  deals: Deal[];
  onEdit: (d: Deal) => void;
  onRemove: (id: string) => void;
}) {
  const [filter, setFilter] = useState<'alla' | 'oppna' | 'vunna'>('alla');

  const synliga = useMemo(() => {
    if (filter === 'oppna') return deals.filter(isOpen);
    if (filter === 'vunna') return deals.filter((d) => STATUS_META[d.status].vunnen);
    return deals;
  }, [deals, filter]);

  return (
    <>
      <RuleHeading
        action={
          <div className="flex gap-1.5">
            {(['alla', 'oppna', 'vunna'] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}>
                <Chip color={filter === f ? 'var(--accent)' : 'var(--ink-3)'}>
                  {f === 'alla' ? 'Alla' : f === 'oppna' ? 'Öppna' : 'Vunna'}
                </Chip>
              </button>
            ))}
          </div>
        }
      >
        {synliga.length} affärer
      </RuleHeading>

      <GlassCard className="!p-0 overflow-hidden">
        <ul className="divide-y divide-[var(--hair)]">
          {synliga.map((d) => {
            const grad = tg(d);
            return (
              <li key={d.id} className="flex items-center">
                <div className="min-w-0 flex-1">
                  <Row
                    onClick={() => onEdit(d)}
                    label={`${d.kund} · ${d.titel}`}
                    sub={[
                      STATUS_META[d.status].label,
                      `TB ${kr(tb(d))}`,
                      grad !== undefined ? `TG ${grad.toFixed(0)} %` : 'TG saknas',
                      d.stangd ? `stängd ${d.stangd}` : `öppnad ${d.oppnad}`,
                      typeof d.sannolikhet === 'number' ? `${d.sannolikhet} %` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                    value={kr(d.varde)}
                  />
                </div>
                <button
                  onClick={() => onRemove(d.id)}
                  className="px-3 py-4 text-[var(--ink-3)] active:text-[#ff6b4a]"
                  aria-label={`Ta bort ${d.titel}`}
                >
                  <IconTrash className="w-5 h-5" />
                </button>
              </li>
            );
          })}
        </ul>
      </GlassCard>
    </>
  );
}

function Kostnader({
  costs,
  onRemove,
  onAdd,
}: {
  costs: FixedCost[];
  onRemove: (id: string) => void;
  onAdd: () => void;
}) {
  const perManad = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of costs) map.set(c.manad, (map.get(c.manad) ?? 0) + c.belopp);
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [costs]);

  return (
    <>
      <RuleHeading
        action={
          <button
            onClick={onAdd}
            className="text-[12px] font-semibold tracking-[0.08em] uppercase"
            style={{ color: 'var(--accent)' }}
          >
            Lägg till
          </button>
        }
      >
        Fasta kostnader
      </RuleHeading>

      {costs.length === 0 ? (
        <GlassCard>
          <p className="text-[14px] leading-relaxed text-[var(--ink-2)]">
            Inga fasta kostnader inlagda. Utan dem är resultatet på översikten lika med
            täckningsbidraget — alltså för högt.
          </p>
        </GlassCard>
      ) : (
        <>
          {perManad.map(([manad, summa]) => (
            <div key={manad} className="mb-3">
              <div className="flex items-baseline justify-between px-1 pb-2">
                <span className="micro">{monthLabel(manad)}</span>
                <span className="tnum text-[13px] font-medium text-[var(--ink-2)]">
                  {kr(summa)}
                </span>
              </div>
              <GlassCard className="!p-0 overflow-hidden">
                <ul className="divide-y divide-[var(--hair)]">
                  {costs
                    .filter((c) => c.manad === manad)
                    .map((c) => (
                      <li key={c.id} className="flex items-center">
                        <div className="min-w-0 flex-1">
                          <Row label={COST_META[c.kategori]} sub={c.note} value={kr(c.belopp)} />
                        </div>
                        <button
                          onClick={() => onRemove(c.id)}
                          className="px-3 py-4 text-[var(--ink-3)] active:text-[#ff6b4a]"
                          aria-label={`Ta bort ${COST_META[c.kategori]}`}
                        >
                          <IconTrash className="w-5 h-5" />
                        </button>
                      </li>
                    ))}
                </ul>
              </GlassCard>
            </div>
          ))}
        </>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Formulär                                                            */
/* ------------------------------------------------------------------ */

function DealForm({
  opened,
  initial,
  onClose,
  onSave,
}: {
  opened: boolean;
  initial?: Deal;
  onClose: () => void;
  onSave: (d: Deal) => void;
}) {
  const [kund, setKund] = useState(initial?.kund ?? '');
  const [titel, setTitel] = useState(initial?.titel ?? '');
  const [status, setStatus] = useState<DealStatus>(initial?.status ?? 'offert');
  const [varde, setVarde] = useState(initial ? String(initial.varde) : '');
  const [kostnad, setKostnad] = useState(initial ? String(initial.rorligKostnad) : '');
  const [sannolikhet, setSannolikhet] = useState(
    typeof initial?.sannolikhet === 'number' ? String(initial.sannolikhet) : '',
  );
  const [oppnad, setOppnad] = useState(initial?.oppnad ?? today());
  const [stangd, setStangd] = useState(initial?.stangd ?? today());
  const [kalla, setKalla] = useState(initial?.kalla ?? '');

  const avgjord = !STATUS_META[status].oppen;
  const v = Number(varde.replace(',', '.')) || 0;
  const k = Number(kostnad.replace(',', '.')) || 0;
  const bidrag = v - k;
  const grad = v > 0 ? (bidrag / v) * 100 : undefined;
  const giltig = kund.trim() !== '' && titel.trim() !== '' && v > 0 && k <= v;

  function spara() {
    onSave({
      id: initial?.id ?? uid('d'),
      kund: kund.trim(),
      titel: titel.trim(),
      status,
      varde: v,
      rorligKostnad: k,
      sannolikhet: sannolikhet.trim() === '' ? undefined : Number(sannolikhet),
      oppnad,
      // Databasen kräver att stängningsdatum följer status — skicka aldrig
      // ett datum för en affär som fortfarande är öppen.
      stangd: avgjord ? stangd : undefined,
      kalla: kalla.trim() || undefined,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    });
  }

  return (
    <Sheet opened={opened} onBackdropClick={onClose} className="max-h-[92vh] overflow-auto pb-safe">
      <div className="p-4">
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-white/25" />
        <h2 className="text-[20px] font-semibold text-white">
          {initial ? 'Ändra affär' : 'Ny affär'}
        </h2>

        <div className="mt-4 flex flex-col gap-3">
          <Falt label="Kund" value={kund} onChange={setKund} placeholder="Bostadsrättsförening X" />
          <Falt
            label="Vad"
            value={titel}
            onChange={setTitel}
            placeholder="Laddstolpar, 12 platser"
          />

          <div>
            <span className="micro">Status</span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {DEAL_STATUSES.map((s) => (
                <button key={s} onClick={() => setStatus(s)} type="button">
                  <Chip color={status === s ? 'var(--accent)' : 'var(--ink-3)'}>
                    {STATUS_META[s].label}
                  </Chip>
                </button>
              ))}
            </div>
            <p className="mt-2 text-[12px] text-[var(--ink-3)]">{STATUS_META[status].hint}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Falt
              label="Värde (ex moms)"
              value={varde}
              onChange={setVarde}
              numerisk
              placeholder="0"
            />
            <Falt
              label="Rörlig kostnad"
              value={kostnad}
              onChange={setKostnad}
              numerisk
              placeholder="0"
            />
          </div>

          {v > 0 && (
            <div className="well flex items-baseline justify-between px-4 py-3">
              <span className="text-[13px] text-[var(--ink-2)]">Täckningsbidrag</span>
              <span className="tnum text-[15px] font-semibold text-white">
                {kr(bidrag)}
                {grad !== undefined && (
                  <span className="ml-2 text-[13px] font-normal text-[var(--ink-2)]">
                    {grad.toFixed(0)} %
                  </span>
                )}
              </span>
            </div>
          )}

          {k > v && v > 0 && (
            <p className="text-[12px] leading-relaxed text-[#ff6b4a]">
              Den rörliga kostnaden är högre än värdet. Går affären verkligen med förlust, lägg in
              den — men kolla siffrorna först.
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Falt label="Öppnad" value={oppnad} onChange={setOppnad} typ="date" />
            {avgjord && <Falt label="Stängd" value={stangd} onChange={setStangd} typ="date" />}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Falt
              label="Sannolikhet %"
              value={sannolikhet}
              onChange={setSannolikhet}
              numerisk
              placeholder="lämna tom"
            />
            <Falt label="Källa" value={kalla} onChange={setKalla} placeholder="rekommendation" />
          </div>

          {!avgjord && sannolikhet.trim() === '' && (
            <p className="text-[12px] leading-relaxed text-[var(--ink-3)]">
              Utan sannolikhet räknas affären in i pipelinen men inte i den viktade siffran. Det är
              med flit — en gissad procentsats ser mer komplett ut och är mindre sann.
            </p>
          )}
        </div>

        <div className="sticky bottom-0 -mx-4 mt-5 flex gap-2 border-t-[0.5px] border-[var(--hair)] px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sheet-footer">
          <Button rounded outline onClick={onClose} className="flex-1">
            Avbryt
          </Button>
          <Button rounded onClick={spara} disabled={!giltig} className="btn-tron flex-[2]">
            Spara
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

function CostForm({
  opened,
  onClose,
  onSave,
}: {
  opened: boolean;
  onClose: () => void;
  onSave: (c: FixedCost) => void;
}) {
  const [manad, setManad] = useState(today().slice(0, 7));
  const [kategori, setKategori] = useState<CostCategory>('lokal');
  const [belopp, setBelopp] = useState('');
  const [note, setNote] = useState('');

  const b = Number(belopp.replace(',', '.')) || 0;

  return (
    <Sheet opened={opened} onBackdropClick={onClose} className="max-h-[88vh] overflow-auto pb-safe">
      <div className="p-4">
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-white/25" />
        <h2 className="text-[20px] font-semibold text-white">Fast kostnad</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-[var(--ink-2)]">
          Kostnader som löper oavsett om något säljs. De dras av på resultatraden, inte från
          täckningsbidraget.
        </p>

        <div className="mt-4 flex flex-col gap-3">
          <Falt label="Månad" value={manad} onChange={setManad} typ="month" />

          <div>
            <span className="micro">Kategori</span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {COST_CATEGORIES.map((c) => (
                <button key={c} onClick={() => setKategori(c)} type="button">
                  <Chip color={kategori === c ? 'var(--accent)' : 'var(--ink-3)'}>
                    {COST_META[c]}
                  </Chip>
                </button>
              ))}
            </div>
          </div>

          <Falt label="Belopp" value={belopp} onChange={setBelopp} numerisk placeholder="0" />
          <Falt label="Anteckning" value={note} onChange={setNote} placeholder="valfritt" />
        </div>

        <div className="sticky bottom-0 -mx-4 mt-5 flex gap-2 border-t-[0.5px] border-[var(--hair)] px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sheet-footer">
          <Button rounded outline onClick={onClose} className="flex-1">
            Avbryt
          </Button>
          <Button
            rounded
            disabled={b <= 0}
            className="btn-tron flex-[2]"
            onClick={() =>
              onSave({
                id: uid('c'),
                manad,
                kategori,
                belopp: b,
                note: note.trim() || undefined,
                createdAt: new Date().toISOString(),
              })
            }
          >
            Spara
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

function Falt({
  label,
  value,
  onChange,
  placeholder,
  numerisk = false,
  typ,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  numerisk?: boolean;
  typ?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="micro">{label}</span>
      <input
        type={typ ?? 'text'}
        inputMode={numerisk ? 'decimal' : undefined}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="field px-3.5 py-2.5 text-[16px]"
      />
    </label>
  );
}
