'use client';

import { Block, Button, Sheet } from 'konsta/react';
import { useMemo, useRef, useState } from 'react';
import { BarList, StackedShare, TIER_COLORS, ColumnChart } from '@/components/charts';
import { IconCamera, IconSparkle, IconTrash, IconWarning } from '@/components/icons';
import Shell from '@/components/Shell';
import { Chip, EmptyState, GlassCard, Row, SectionTitle, StatTile, Tabs } from '@/components/ui';
import {
  buildInsights,
  flattenItems,
  rollupProducts,
  spendByCategory,
  spendByMonth,
  spendByTier,
} from '@/lib/analytics';
import { CATEGORY_META, meta } from '@/lib/food';
import { prepareImage } from '@/lib/image';
import type { ParsedReceipt } from '@/lib/receipt-schema';
import { useStore } from '@/lib/store';
import type { Receipt, ReceiptItem } from '@/lib/types';
import { kr, monthLabel, num, uid } from '@/lib/utils';

type View = 'oversikt' | 'varor' | 'kvitton';

export default function KvittonPage() {
  const { state, ready, addReceipt, removeReceipt, uploadImage, error: storeError } = useStore();
  const [view, setView] = useState<View>('oversikt');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ parsed: ParsedReceipt; imageKey?: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const receipts = state.receipts;
  const items = useMemo(() => flattenItems(receipts), [receipts]);
  const categories = useMemo(() => spendByCategory(items), [items]);
  const tiers = useMemo(() => spendByTier(items), [items]);
  const products = useMemo(() => rollupProducts(items), [items]);
  const months = useMemo(() => spendByMonth(receipts), [receipts]);
  const insights = useMemo(() => buildInsights(receipts), [receipts]);

  const totalSpend = receipts.reduce((a, r) => a + r.total, 0);
  const lowConfidence = items.filter((i) => (i.confidence ?? 1) < 0.6).length;

  async function handleFile(file: File) {
    setError(null);
    setBusy(true);
    try {
      const image = await prepareImage(file);
      const response = await fetch('/api/receipt/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: image.base64, mediaType: image.mediaType }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setError(payload.message ?? 'Något gick fel vid tolkningen.');
        return;
      }

      // Bilden laddas upp direkt; kvittot sparas först när du godkänt raderna.
      const imageKey = await uploadImage(image.blob);
      setDraft({ parsed: payload.receipt as ParsedReceipt, imageKey });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte läsa bilden.');
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  async function commitDraft() {
    if (!draft) return;
    const { parsed, imageKey } = draft;

    setBusy(true);
    await addReceipt({
      store: parsed.store || 'Okänd butik',
      purchasedAt: parsed.purchasedAt || new Date().toISOString().slice(0, 10),
      total: parsed.total,
      currency: 'SEK',
      source: 'llm',
      imageKey,
      note: parsed.warnings.length ? parsed.warnings.join(' · ') : undefined,
      items: parsed.items.map<ReceiptItem>((item) => ({
        id: uid('i'),
        raw: item.raw,
        name: item.name,
        brand: item.brand ?? undefined,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        weightGrams: item.weightGrams ?? undefined,
        volumeMl: item.volumeMl ?? undefined,
        totalPrice: item.totalPrice,
        discount: item.discount ?? undefined,
        confidence: item.confidence,
      })),
    });
    setBusy(false);
    setDraft(null);
  }

  function discardDraft() {
    // Den uppladdade bilden blir kvar i storage. Det är ett medvetet val:
    // hellre en föräldralös bild än ett raderingsanrop som kan misslyckas
    // och lämna kvittot utan bild.
    setDraft(null);
  }

  const draftSum = draft ? draft.parsed.items.reduce((a, i) => a + i.totalPrice, 0) : 0;
  const draftMismatch = draft ? Math.abs(draftSum - draft.parsed.total) : 0;

  return (
    <Shell title="Kvitton" subtitle={ready ? `${receipts.length} inlästa` : 'Läser…'}>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      <Block className="!mt-3 !mb-0 space-y-3">
        <Button
          large
          rounded
          onClick={() => fileInput.current?.click()}
          disabled={busy}
          className="k-color-brand-primary"
        >
          <span className="flex items-center gap-2">
            {busy ? <IconSparkle className="w-5 h-5 animate-pulse" /> : <IconCamera className="w-5 h-5" />}
            {busy ? 'Läser kvittot…' : 'Skanna kvitto'}
          </span>
        </Button>

        {(error ?? storeError) && (
          <GlassCard className="flex items-start gap-3" shine={false}>
            <IconWarning className="w-5 h-5 shrink-0 text-[#fa6a22]" />
            <p className="text-[14px] leading-relaxed text-white/80">{error ?? storeError}</p>
          </GlassCard>
        )}

        <Tabs
          value={view}
          onChange={setView}
          options={
            [
              ['oversikt', 'Översikt'],
            ['varor', 'Varor'],
            ['kvitton', 'Kvitton'],
            ] as const
          }
        />
      </Block>

      {receipts.length === 0 ? (
        <Block className="!mt-6">
          <EmptyState
            icon={<IconReceiptBig />}
            title="Inga kvitton än"
            body="Fota ett matkvitto så delar modellen upp det i varor, mängd, pris och kilopris. Efter tre–fyra kvitton börjar mönstren synas."
          />
        </Block>
      ) : view === 'oversikt' ? (
        <Overview
          totalSpend={totalSpend}
          receiptCount={receipts.length}
          itemCount={items.length}
          lowConfidence={lowConfidence}
          tiers={tiers}
          categories={categories}
          months={months}
          insights={insights}
        />
      ) : view === 'varor' ? (
        <Products products={products} />
      ) : (
        <ReceiptList receipts={receipts} onRemove={removeReceipt} />
      )}

      <Sheet
        opened={draft !== null}
        onBackdropClick={discardDraft}
        className="max-h-[88vh] overflow-auto pb-safe"
      >
        {draft && (
          <div className="p-4">
            <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-white/25" />
            <h2 className="text-[20px] font-semibold text-white">{draft.parsed.store}</h2>
            <p className="mt-0.5 text-[13px] text-white/50">
              {draft.parsed.purchasedAt || 'Datum saknas på kvittot'} ·{' '}
              {draft.parsed.items.length} varor
            </p>

            {draftMismatch > 1 && (
              <div className="mt-3 flex items-start gap-2 rounded-2xl border border-[#fa6a22]/30 bg-[#fa6a22]/10 p-3">
                <IconWarning className="w-5 h-5 shrink-0 text-[#fa6a22]" />
                <p className="text-[13px] leading-relaxed text-white/80">
                  Raderna summerar till {kr(draftSum, true)} men kvittot säger{' '}
                  {kr(draft.parsed.total, true)}. Skillnad {kr(draftMismatch, true)} — troligen en
                  rad som inte gick att läsa.
                </p>
              </div>
            )}

            {draft.parsed.warnings.length > 0 && (
              <ul className="mt-3 space-y-1">
                {draft.parsed.warnings.map((w, i) => (
                  <li key={i} className="text-[13px] leading-relaxed text-white/50">
                    · {w}
                  </li>
                ))}
              </ul>
            )}

            <ul className="mt-4 divide-y divide-white/[0.07]">
              {draft.parsed.items.map((item, i) => {
                const m = meta(item.category);
                const ppk =
                  item.weightGrams && item.weightGrams > 0
                    ? (item.totalPrice / item.weightGrams) * 1000
                    : undefined;
                return (
                  <li key={i} className="flex items-start gap-3 py-2.5">
                    <span className="text-[18px] leading-none pt-0.5">{m.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] text-white">{item.name}</p>
                      <p className="truncate text-[12px] text-white/40">
                        {num(item.quantity)} {item.unit}
                        {item.weightGrams ? ` · ${num(item.weightGrams)} g` : ''}
                        {ppk ? ` · ${kr(ppk)}/kg` : ''}
                        {item.confidence < 0.6 ? ' · osäker' : ''}
                      </p>
                    </div>
                    <span className="tnum shrink-0 text-[15px] font-medium text-white/85">
                      {kr(item.totalPrice, true)}
                    </span>
                  </li>
                );
              })}
            </ul>

            <div className="sticky bottom-0 -mx-4 mt-4 flex gap-2 border-t-[0.5px] border-white/10 bg-black/70 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
              <Button rounded outline onClick={discardDraft} className="flex-1">
                Kasta
              </Button>
              <Button rounded onClick={() => void commitDraft()} disabled={busy} className="flex-[2]">
                Spara {kr(draft.parsed.total)}
              </Button>
            </div>
          </div>
        )}
      </Sheet>
    </Shell>
  );
}

/* ------------------------------------------------------------------ */

function Overview({
  totalSpend,
  receiptCount,
  itemCount,
  lowConfidence,
  tiers,
  categories,
  months,
  insights,
}: {
  totalSpend: number;
  receiptCount: number;
  itemCount: number;
  lowConfidence: number;
  tiers: Record<'satsa' | 'neutral' | 'skar-ner', number>;
  categories: ReturnType<typeof spendByCategory>;
  months: ReturnType<typeof spendByMonth>;
  insights: ReturnType<typeof buildInsights>;
}) {
  const avgPerReceipt = receiptCount > 0 ? totalSpend / receiptCount : 0;

  return (
    <Block className="!mt-0 space-y-0">
      <SectionTitle>Läget</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Totalt" value={kr(totalSpend)} hint={`${receiptCount} kvitton`} />
        <StatTile
          label="Snitt per kvitto"
          value={kr(avgPerReceipt)}
          hint={`${itemCount} varurader`}
        />
      </div>

      <SectionTitle>Vart pengarna går</SectionTitle>
      <GlassCard>
        <StackedShare
          segments={[
            { label: 'Satsa på', value: tiers.satsa, color: TIER_COLORS.satsa },
            { label: 'Neutralt', value: tiers.neutral, color: TIER_COLORS.neutral },
            { label: 'Skär ner', value: tiers['skar-ner'], color: TIER_COLORS['skar-ner'] },
          ]}
          format={(n) => kr(n)}
        />
      </GlassCard>

      {months.length >= 2 && (
        <>
          <SectionTitle>Per månad</SectionTitle>
          <GlassCard>
            <ColumnChart
              data={months.map((m) => ({ label: monthLabel(m.month), value: m.total }))}
              format={(n) => kr(n)}
            />
          </GlassCard>
        </>
      )}

      <SectionTitle>Kategorier</SectionTitle>
      <GlassCard>
        <BarList
          data={categories.slice(0, 10).map((c) => ({
            label: `${CATEGORY_META[c.category].icon} ${CATEGORY_META[c.category].label}`,
            value: c.total,
            color: CATEGORY_META[c.category].color,
            formatted: kr(c.total),
            meta: `${(c.share * 100).toFixed(0)} %`,
          }))}
        />
      </GlassCard>

      {insights.length > 0 && (
        <>
          <SectionTitle>Slutsatser</SectionTitle>
          <div className="space-y-3">
            {insights.map((insight, i) => (
              <GlassCard key={i} className="space-y-1.5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-[16px] font-semibold leading-snug text-white">
                    {insight.title}
                  </h3>
                  {insight.amount !== undefined && (
                    <span className="tnum shrink-0 text-[15px] font-semibold text-white/70">
                      {kr(insight.amount)}
                    </span>
                  )}
                </div>
                <p className="text-[14px] leading-relaxed text-white/55">{insight.body}</p>
              </GlassCard>
            ))}
          </div>
        </>
      )}

      {lowConfidence > 0 && (
        <>
          <SectionTitle>Kvalitet</SectionTitle>
          <GlassCard className="flex items-start gap-3" shine={false}>
            <IconWarning className="w-5 h-5 shrink-0 text-[#fa6a22]" />
            <p className="text-[14px] leading-relaxed text-white/70">
              {lowConfidence} varurader lästes med låg säkerhet. Siffrorna ovan är i den delen
              ungefärliga — kolla dem under fliken Varor.
            </p>
          </GlassCard>
        </>
      )}
    </Block>
  );
}

function Products({ products }: { products: ReturnType<typeof rollupProducts> }) {
  const [sort, setSort] = useState<'spend' | 'kilo'>('spend');

  const sorted = useMemo(() => {
    if (sort === 'spend') return products;
    return [...products]
      .filter((p) => p.avgPricePerKg)
      .sort((a, b) => b.avgPricePerKg! - a.avgPricePerKg!);
  }, [products, sort]);

  return (
    <Block className="!mt-0 space-y-0">
      <SectionTitle
        action={
          <button
            onClick={() => setSort(sort === 'spend' ? 'kilo' : 'spend')}
            className="text-[13px] font-medium text-[#0a84ff]"
          >
            {sort === 'spend' ? 'Sortera på kilopris' : 'Sortera på summa'}
          </button>
        }
      >
        {sort === 'spend' ? 'Mest pengar' : 'Dyrast per kilo'}
      </SectionTitle>

      <GlassCard className="!p-0 overflow-hidden">
        <ul className="divide-y divide-white/[0.06]">
          {sorted.slice(0, 60).map((p) => (
            <li key={p.key}>
              <Row
                accent={CATEGORY_META[p.category].color}
                label={`${CATEGORY_META[p.category].icon} ${p.name}`}
                sub={[
                  `${p.purchases} köp`,
                  p.totalGrams > 0 ? `${num(p.totalGrams / 1000, 1)} kg` : null,
                  p.avgPricePerKg ? `${kr(p.avgPricePerKg)}/kg` : null,
                  p.minPricePerKg && p.maxPricePerKg && p.maxPricePerKg > p.minPricePerKg
                    ? `spann ${kr(p.minPricePerKg)}–${kr(p.maxPricePerKg)}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                value={sort === 'spend' ? kr(p.total) : `${kr(p.avgPricePerKg ?? 0)}/kg`}
              />
            </li>
          ))}
        </ul>
      </GlassCard>

      {sort === 'kilo' && sorted.length === 0 && (
        <p className="px-4 py-6 text-center text-[14px] text-white/40">
          Inga varor med känd vikt än. Kilopris kräver att förpackningsstorleken syns på kvittot.
        </p>
      )}
    </Block>
  );
}

function ReceiptList({
  receipts,
  onRemove,
}: {
  receipts: Receipt[];
  onRemove: (r: Receipt) => void;
}) {
  return (
    <Block className="!mt-0 space-y-0">
      <SectionTitle>Alla kvitton</SectionTitle>
      <div className="space-y-3">
        {receipts.map((receipt) => {
          const lineSum = receipt.items.reduce((a, i) => a + i.totalPrice, 0);
          const mismatch = Math.abs(lineSum - receipt.total) > 1;
          return (
            <GlassCard key={receipt.id} className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[16px] font-semibold text-white">{receipt.store}</p>
                  <p className="text-[12px] text-white/40">
                    {receipt.purchasedAt} · {receipt.items.length} varor
                    {receipt.source === 'manuell' ? ' · manuell' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="tnum text-[16px] font-semibold text-white">
                    {kr(receipt.total)}
                  </span>
                  <button
                    onClick={() => onRemove(receipt)}
                    className="p-1.5 text-white/30 active:text-[#fa6a22]"
                    aria-label={`Ta bort kvitto från ${receipt.store}`}
                  >
                    <IconTrash className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {mismatch && (
                <p className="text-[12px] text-[#fa6a22]">
                  Rader: {kr(lineSum, true)} — avviker från totalen.
                </p>
              )}

              <div className="flex flex-wrap gap-1.5">
                {topCategories(receipt).map(([category, sum]) => (
                  <Chip key={category} color={CATEGORY_META[category].color}>
                    {CATEGORY_META[category].icon} {kr(sum)}
                  </Chip>
                ))}
              </div>
            </GlassCard>
          );
        })}
      </div>
    </Block>
  );
}

function topCategories(receipt: Receipt) {
  const map = new Map<ReceiptItem['category'], number>();
  for (const item of receipt.items) {
    map.set(item.category, (map.get(item.category) ?? 0) + item.totalPrice);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
}

function IconReceiptBig() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-12 h-12"
      aria-hidden
    >
      <path d="M6 2.75h12a.75.75 0 0 1 .75.75v17.25l-2.6-1.6-2.6 1.6-2.55-1.6-2.55 1.6-2.6-1.6V3.5A.75.75 0 0 1 6 2.75Z" />
      <path d="M9 7.5h6M9 11h6M9 14.5h3.5" />
    </svg>
  );
}
