import { CATEGORY_META, type Tier } from './food';
import type {
  CashFlow,
  Currency,
  FoodCategory,
  Holding,
  Receipt,
  ReceiptItem,
  Workout,
} from './types';
import { monthKey } from './utils';

/* ================================================================== */
/* MAT                                                                 */
/* ================================================================== */

export interface ItemWithContext extends ReceiptItem {
  receiptId: string;
  store: string;
  purchasedAt: string;
}

export function flattenItems(receipts: Receipt[]): ItemWithContext[] {
  return receipts.flatMap((r) =>
    r.items.map((item) => ({
      ...item,
      receiptId: r.id,
      store: r.store,
      purchasedAt: r.purchasedAt,
    })),
  );
}

/** Kilopris för en rad, om vikten är känd. */
export function pricePerKg(item: ReceiptItem): number | undefined {
  if (!item.weightGrams || item.weightGrams <= 0) return undefined;
  return (item.totalPrice / item.weightGrams) * 1000;
}

/** Literpris för en rad, om volymen är känd. */
export function pricePerLitre(item: ReceiptItem): number | undefined {
  if (!item.volumeMl || item.volumeMl <= 0) return undefined;
  return (item.totalPrice / item.volumeMl) * 1000;
}

export interface CategorySpend {
  category: FoodCategory;
  total: number;
  share: number;
  lines: number;
  tier: Tier;
}

export function spendByCategory(items: ItemWithContext[]): CategorySpend[] {
  const sums = new Map<FoodCategory, { total: number; lines: number }>();
  for (const item of items) {
    const prev = sums.get(item.category) ?? { total: 0, lines: 0 };
    sums.set(item.category, { total: prev.total + item.totalPrice, lines: prev.lines + 1 });
  }
  const grand = [...sums.values()].reduce((a, b) => a + b.total, 0) || 1;
  return [...sums.entries()]
    .map(([category, v]) => ({
      category,
      total: v.total,
      lines: v.lines,
      share: v.total / grand,
      tier: CATEGORY_META[category]?.tier ?? 'neutral',
    }))
    .sort((a, b) => b.total - a.total);
}

export function spendByTier(items: ItemWithContext[]): Record<Tier, number> {
  const out: Record<Tier, number> = { satsa: 0, neutral: 0, 'skar-ner': 0 };
  for (const item of items) {
    const tier = CATEGORY_META[item.category]?.tier ?? 'neutral';
    out[tier] += item.totalPrice;
  }
  return out;
}

export interface ProductRollup {
  key: string;
  name: string;
  category: FoodCategory;
  total: number;
  purchases: number;
  totalGrams: number;
  /** Viktat snittkilopris över alla köp där vikt fanns. */
  avgPricePerKg?: number;
  /** Lägsta respektive högsta kilopris som setts. */
  minPricePerKg?: number;
  maxPricePerKg?: number;
  lastPurchase: string;
}

/** Slår ihop rader till produkter på normaliserat namn. */
export function rollupProducts(items: ItemWithContext[]): ProductRollup[] {
  const map = new Map<string, ProductRollup & { weightedKgSum: number; weightedKgMass: number }>();

  for (const item of items) {
    const key = item.name.trim().toLowerCase();
    const existing = map.get(key);
    const ppk = pricePerKg(item);

    if (!existing) {
      map.set(key, {
        key,
        name: item.name.trim(),
        category: item.category,
        total: item.totalPrice,
        purchases: 1,
        totalGrams: item.weightGrams ?? 0,
        minPricePerKg: ppk,
        maxPricePerKg: ppk,
        lastPurchase: item.purchasedAt,
        weightedKgSum: ppk ? ppk * (item.weightGrams ?? 0) : 0,
        weightedKgMass: ppk ? (item.weightGrams ?? 0) : 0,
      });
      continue;
    }

    existing.total += item.totalPrice;
    existing.purchases += 1;
    existing.totalGrams += item.weightGrams ?? 0;
    if (item.purchasedAt > existing.lastPurchase) existing.lastPurchase = item.purchasedAt;
    if (ppk !== undefined) {
      existing.minPricePerKg =
        existing.minPricePerKg === undefined ? ppk : Math.min(existing.minPricePerKg, ppk);
      existing.maxPricePerKg =
        existing.maxPricePerKg === undefined ? ppk : Math.max(existing.maxPricePerKg, ppk);
      existing.weightedKgSum += ppk * (item.weightGrams ?? 0);
      existing.weightedKgMass += item.weightGrams ?? 0;
    }
  }

  return [...map.values()]
    .map(({ weightedKgSum, weightedKgMass, ...rest }) => ({
      ...rest,
      avgPricePerKg: weightedKgMass > 0 ? weightedKgSum / weightedKgMass : undefined,
    }))
    .sort((a, b) => b.total - a.total);
}

export interface MonthlySpend {
  month: string;
  total: number;
  byTier: Record<Tier, number>;
}

export function spendByMonth(receipts: Receipt[]): MonthlySpend[] {
  const map = new Map<string, MonthlySpend>();
  for (const receipt of receipts) {
    const key = monthKey(receipt.purchasedAt);
    const entry =
      map.get(key) ?? { month: key, total: 0, byTier: { satsa: 0, neutral: 0, 'skar-ner': 0 } };
    entry.total += receipt.total;
    for (const item of receipt.items) {
      const tier = CATEGORY_META[item.category]?.tier ?? 'neutral';
      entry.byTier[tier] += item.totalPrice;
    }
    map.set(key, entry);
  }
  return [...map.values()].sort((a, b) => a.month.localeCompare(b.month));
}

export interface Insight {
  kind: 'skar-ner' | 'satsa' | 'prisvarning' | 'fynd';
  title: string;
  body: string;
  amount?: number;
}

/**
 * Den faktiska "vad ska jag göra"-delen.
 * Allt här är härlett ur data — inga LLM-anrop, inga gissningar.
 */
export function buildInsights(receipts: Receipt[]): Insight[] {
  const items = flattenItems(receipts);
  if (items.length === 0) return [];

  const insights: Insight[] = [];
  const cats = spendByCategory(items);
  const tiers = spendByTier(items);
  const totalSpend = cats.reduce((a, c) => a + c.total, 0);

  // 1. Största läckaget bland "skär ner"-kategorierna.
  const worst = cats.filter((c) => c.tier === 'skar-ner').sort((a, b) => b.total - a.total)[0];
  if (worst && worst.total > 0) {
    insights.push({
      kind: 'skar-ner',
      title: `${CATEGORY_META[worst.category].label} kostar dig mest av det du kan stryka`,
      body: `${(worst.share * 100).toFixed(0)} % av matbudgeten går hit över ${worst.lines} rader. Halverar du den posten frigörs pengar utan att något näringsmässigt försvinner.`,
      amount: worst.total,
    });
  }

  // 2. Andel som faktiskt går till näringstät mat.
  if (totalSpend > 0) {
    const share = tiers.satsa / totalSpend;
    insights.push({
      kind: 'satsa',
      title: `${(share * 100).toFixed(0)} % av maten går till det som bygger dig`,
      body:
        share < 0.55
          ? 'Under 55 %. Flytta den posten uppåt genom att byta färdigmat och snacks mot kött, ägg, mejeri och grönt.'
          : 'Bra fördelning. Håll den och optimera i stället på kilopris inom kategorierna.',
      amount: tiers.satsa,
    });
  }

  // 3. Produkter där kilopriset svänger kraftigt — där finns pengar att tajma.
  const products = rollupProducts(items).filter(
    (p) => p.purchases >= 2 && p.minPricePerKg && p.maxPricePerKg,
  );
  const swingiest = products
    .map((p) => ({ p, swing: (p.maxPricePerKg! - p.minPricePerKg!) / p.minPricePerKg! }))
    .filter((x) => x.swing > 0.2)
    .sort((a, b) => b.swing - a.swing)[0];
  if (swingiest) {
    insights.push({
      kind: 'prisvarning',
      title: `${swingiest.p.name} svänger ${(swingiest.swing * 100).toFixed(0)} % i kilopris`,
      body: `Mellan ${swingiest.p.minPricePerKg!.toFixed(0)} och ${swingiest.p.maxPricePerKg!.toFixed(0)} kr/kg. Köp på det låga läget och frys in.`,
    });
  }

  // 4. Billigaste proteinkällan per kg av det du faktiskt köper.
  const protein = products
    .filter((p) => ['kott', 'fisk', 'agg', 'mejeri'].includes(p.category))
    .filter((p) => p.avgPricePerKg)
    .sort((a, b) => a.avgPricePerKg! - b.avgPricePerKg!)[0];
  if (protein) {
    insights.push({
      kind: 'fynd',
      title: `Billigaste proteinet du köper: ${protein.name}`,
      body: `${protein.avgPricePerKg!.toFixed(0)} kr/kg i snitt över ${protein.purchases} köp. Bygg fler måltider runt den.`,
    });
  }

  return insights;
}

/* ================================================================== */
/* KAPITAL                                                             */
/* ================================================================== */

/** Statiska fallback-kurser. Byts av riktiga kurser när FINNHUB_API_KEY finns. */
export const FX_FALLBACK: Record<Currency, number> = {
  SEK: 1,
  USD: 10.5,
  EUR: 11.3,
  NOK: 0.95,
  DKK: 1.52,
};

export function toSek(amount: number, currency: Currency, fx = FX_FALLBACK): number {
  return amount * (fx[currency] ?? 1);
}

export interface HoldingValuation {
  holding: Holding;
  /** Marknadsvärde i SEK. Faller tillbaka på anskaffningsvärde om kurs saknas. */
  marketValue: number;
  costBasis: number;
  gain: number;
  gainPct: number;
  hasPrice: boolean;
}

export function valuate(holdings: Holding[], fx = FX_FALLBACK): HoldingValuation[] {
  return holdings.map((holding) => {
    const costBasis = toSek(holding.avgCost * holding.quantity, holding.currency, fx);
    const hasPrice = typeof holding.lastPrice === 'number' && holding.lastPrice > 0;
    const marketValue = hasPrice
      ? toSek(holding.lastPrice! * holding.quantity, holding.currency, fx)
      : costBasis;
    const gain = marketValue - costBasis;
    return {
      holding,
      marketValue,
      costBasis,
      gain,
      gainPct: costBasis > 0 ? (gain / costBasis) * 100 : 0,
      hasPrice,
    };
  });
}

export interface PortfolioSummary {
  marketValue: number;
  costBasis: number;
  gain: number;
  gainPct: number;
  deposited: number;
  withdrawn: number;
  dividends: number;
  fees: number;
  /** Marknadsvärde minus nettoinsättning. Det enda avkastningsmått som inte ljuger. */
  netReturn: number;
  /** Andel av portföljen som saknar kurs — ett mått på hur mycket du får gissa. */
  staleShare: number;
  unpricedCount: number;
}

export function summarize(
  holdings: Holding[],
  cashflows: CashFlow[],
  fx = FX_FALLBACK,
): PortfolioSummary {
  const vals = valuate(holdings, fx);
  const marketValue = vals.reduce((a, v) => a + v.marketValue, 0);
  const costBasis = vals.reduce((a, v) => a + v.costBasis, 0);
  const unpriced = vals.filter((v) => !v.hasPrice);
  const staleValue = unpriced.reduce((a, v) => a + v.marketValue, 0);

  const sum = (type: CashFlow['type']) =>
    cashflows.filter((c) => c.type === type).reduce((a, c) => a + c.amount, 0);

  const deposited = sum('insattning');
  const withdrawn = sum('uttag');
  const dividends = sum('utdelning');
  const fees = sum('avgift');
  const net = deposited - withdrawn;

  return {
    marketValue,
    costBasis,
    gain: marketValue - costBasis,
    gainPct: costBasis > 0 ? ((marketValue - costBasis) / costBasis) * 100 : 0,
    deposited,
    withdrawn,
    dividends,
    fees,
    netReturn: net > 0 ? marketValue + withdrawn + dividends - deposited : 0,
    staleShare: marketValue > 0 ? staleValue / marketValue : 0,
    unpricedCount: unpriced.length,
  };
}

export interface Exposure {
  label: string;
  value: number;
  share: number;
}

/** Exponering per godtycklig nyckel: konto, typ, valuta eller tagg. */
export function exposureBy(
  holdings: Holding[],
  key: 'account' | 'kind' | 'currency' | 'tags',
  fx = FX_FALLBACK,
): Exposure[] {
  const vals = valuate(holdings, fx);
  const map = new Map<string, number>();

  for (const v of vals) {
    const labels: string[] =
      key === 'tags'
        ? v.holding.tags.length
          ? v.holding.tags
          : ['otaggat']
        : [String(v.holding[key])];
    // En innehav med flera taggar räknas fullt i varje tagg — summan kan alltså
    // överstiga 100 %. Det är avsikten: taggar beskriver överlappande teman.
    for (const label of labels) {
      map.set(label, (map.get(label) ?? 0) + v.marketValue);
    }
  }

  const total = vals.reduce((a, v) => a + v.marketValue, 0) || 1;
  return [...map.entries()]
    .map(([label, value]) => ({ label, value, share: value / total }))
    .sort((a, b) => b.value - a.value);
}

/** Flaggar koncentrationsrisk. Tröskeln är trubbig med flit. */
export function concentrationWarnings(holdings: Holding[], fx = FX_FALLBACK): string[] {
  const vals = valuate(holdings, fx).sort((a, b) => b.marketValue - a.marketValue);
  const total = vals.reduce((a, v) => a + v.marketValue, 0);
  if (total <= 0) return [];

  const warnings: string[] = [];
  const top = vals[0];
  if (top && top.marketValue / total > 0.25) {
    warnings.push(
      `${top.holding.name} är ${((top.marketValue / total) * 100).toFixed(0)} % av portföljen. Ett enskilt innehav över 25 % gör resultatet till en satsning på ett bolag, inte en portfölj.`,
    );
  }

  const byCurrency = exposureBy(holdings, 'currency', fx);
  const foreign = byCurrency.filter((e) => e.label !== 'SEK').reduce((a, e) => a + e.share, 0);
  if (foreign > 0.7) {
    warnings.push(
      `${(foreign * 100).toFixed(0)} % ligger i utländsk valuta. Din avkastning är till stor del en valutapositionering.`,
    );
  }

  const cashflowFree = vals.filter((v) => !v.hasPrice).length;
  if (cashflowFree > 0) {
    warnings.push(
      `${cashflowFree} innehav saknar kurs och värderas till anskaffningsvärde. Siffrorna ovan är i den delen en gissning.`,
    );
  }

  return warnings;
}

/* ================================================================== */
/* KRAFT                                                               */
/* ================================================================== */

/** Epley. Rimlig upp till ~10 reps, spretar därefter. */
export function estimate1RM(weight: number, reps: number): number {
  if (reps <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

export function workoutVolume(workout: Workout): number {
  return workout.exercises.reduce(
    (total, ex) =>
      total +
      ex.sets.filter((s) => !s.warmup).reduce((a, s) => a + s.weight * s.reps, 0),
    0,
  );
}

export interface ExerciseProgress {
  date: string;
  best1RM: number;
  volume: number;
  /** Summa reps över arbetssetten. Det enda meningsfulla måttet för
   *  kroppsviktsövningar, där vikten är 0 och 1RM därmed alltid blir 0. */
  totalReps: number;
  topSet: { weight: number; reps: number };
}

export function progressFor(workouts: Workout[], exerciseId: string): ExerciseProgress[] {
  return workouts
    .map((w) => {
      const ex = w.exercises.find((e) => e.exerciseId === exerciseId);
      if (!ex) return null;
      const working = ex.sets.filter((s) => !s.warmup);
      if (working.length === 0) return null;

      let best1RM = 0;
      let topSet = working[0];
      for (const set of working) {
        const est = estimate1RM(set.weight, set.reps);
        if (est > best1RM) {
          best1RM = est;
          topSet = set;
        }
      }
      return {
        date: w.date,
        best1RM,
        volume: working.reduce((a, s) => a + s.weight * s.reps, 0),
        totalReps: working.reduce((a, s) => a + s.reps, 0),
        topSet: { weight: topSet.weight, reps: topSet.reps },
      };
    })
    .filter((x): x is ExerciseProgress => x !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export interface WeeklyLoad {
  week: string;
  volume: number;
  sets: number;
  sessions: number;
}

export function weeklyLoad(workouts: Workout[]): WeeklyLoad[] {
  const map = new Map<string, WeeklyLoad>();
  for (const w of workouts) {
    const week = isoWeek(w.date);
    const entry = map.get(week) ?? { week, volume: 0, sets: 0, sessions: 0 };
    entry.volume += workoutVolume(w);
    entry.sets += w.exercises.reduce((a, e) => a + e.sets.filter((s) => !s.warmup).length, 0);
    entry.sessions += 1;
    map.set(week, entry);
  }
  return [...map.values()].sort((a, b) => a.week.localeCompare(b.week));
}

export function isoWeek(isoDate: string): string {
  const date = new Date(isoDate + 'T00:00:00Z');
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-v${String(week).padStart(2, '0')}`;
}
