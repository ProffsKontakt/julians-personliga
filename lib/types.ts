/**
 * Domänmodeller för hubben.
 *
 * Allt pris anges i minsta enhet? Nej — vi kör `number` i SEK (kronor, decimaler).
 * Öresfel är ointressanta här; vi mäter trender, inte bokföring.
 */

export type ISODate = string; // 'YYYY-MM-DD'
export type ISODateTime = string; // full ISO 8601

/* ------------------------------------------------------------------ */
/* Kvitton / mat                                                       */
/* ------------------------------------------------------------------ */

export const FOOD_CATEGORIES = [
  'kott',
  'fisk',
  'agg',
  'mejeri',
  'frukt',
  'gronsaker',
  'notter-fron',
  'spannmal',
  'fett-olja',
  'dryck',
  'godis-snacks',
  'fardigmat',
  'krydda-sas',
  'hushall',
  'ovrigt',
] as const;

export type FoodCategory = (typeof FOOD_CATEGORIES)[number];

export const UNITS = ['st', 'g', 'kg', 'ml', 'l', 'forp'] as const;
export type Unit = (typeof UNITS)[number];

export interface ReceiptItem {
  id: string;
  /** Råa raden från kvittot, oförändrad. Behövs för att kunna rätta LLM:en. */
  raw: string;
  /** Normaliserat namn, t.ex. "Nötfärs 12%". */
  name: string;
  brand?: string;
  category: FoodCategory;
  quantity: number;
  unit: Unit;
  /** Total mängd i gram när varan väger något. 2 × 500 g → 1000. */
  weightGrams?: number;
  /** Total volym i ml när varan är flytande. */
  volumeMl?: number;
  /** Pris för hela raden, efter rabatt. */
  totalPrice: number;
  /** Rabatt som dragits på raden (positivt tal). */
  discount?: number;
  /** Osäkerhet från modellen, 0–1. Under 0.6 → flagga för manuell koll. */
  confidence?: number;
}

export interface Receipt {
  id: string;
  store: string;
  purchasedAt: ISODate;
  /** Totalsumma enligt kvittot. Jämförs mot summan av raderna. */
  total: number;
  currency: 'SEK';
  items: ReceiptItem[];
  /** Nyckel in i bildlagret (IndexedDB). */
  imageKey?: string;
  source: 'llm' | 'manuell';
  createdAt: ISODateTime;
  note?: string;
}

/* ------------------------------------------------------------------ */
/* Kapital                                                             */
/* ------------------------------------------------------------------ */

export const HOLDING_KINDS = ['aktie', 'fond', 'etf', 'krypto', 'ranta'] as const;
export type HoldingKind = (typeof HOLDING_KINDS)[number];

export const ACCOUNT_TYPES = ['ISK', 'KF', 'AF', 'PENSION', 'ANNAT'] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export type Currency = 'SEK' | 'USD' | 'EUR' | 'NOK' | 'DKK';

export interface Holding {
  id: string;
  kind: HoldingKind;
  name: string;
  ticker?: string;
  isin?: string;
  /** Antal aktier / fondandelar. Decimaler tillåtna (fonder). */
  quantity: number;
  /** Genomsnittligt anskaffningsvärde per andel, i `currency`. */
  avgCost: number;
  currency: Currency;
  /** Senast kända kurs per andel, i `currency`. */
  lastPrice?: number;
  lastPriceAt?: ISODateTime;
  account: AccountType;
  /** Fri taggning: "halvledare", "utdelning", "USA". Driver exponeringsvyn. */
  tags: string[];
  createdAt: ISODateTime;
}

export const CASHFLOW_TYPES = ['insattning', 'uttag', 'utdelning', 'avgift'] as const;
export type CashFlowType = (typeof CASHFLOW_TYPES)[number];

export interface CashFlow {
  id: string;
  date: ISODate;
  /** Alltid positivt; `type` bestämmer riktningen. */
  amount: number;
  type: CashFlowType;
  account: AccountType;
  note?: string;
}

/* ------------------------------------------------------------------ */
/* Kraft (träning)                                                     */
/* ------------------------------------------------------------------ */

export interface Exercise {
  id: string;
  name: string;
  /** Primär muskelgrupp — används för volymfördelningen. */
  muscle:
    | 'brost'
    | 'rygg'
    | 'ben'
    | 'axlar'
    | 'armar'
    | 'core'
    | 'helkropp'
    | 'kondition';
  /** Egen kroppsvikt räknas inte som extern belastning i volymberäkningen. */
  bodyweight?: boolean;
}

export interface ProgramExercise {
  exerciseId: string;
  sets: number;
  /** Målintervall, t.ex. "6-8". Fritext med flit — verkligheten är rörig. */
  repRange: string;
  /** Vilotid i sekunder. */
  rest?: number;
  note?: string;
}

export interface Program {
  id: string;
  name: string;
  /** Ett pass i programmet, t.ex. "Push A". */
  days: { id: string; name: string; exercises: ProgramExercise[] }[];
  createdAt: ISODateTime;
  archived?: boolean;
}

export interface SetEntry {
  id: string;
  weight: number; // kg, extern belastning
  reps: number;
  /** Reps in reserve. Valfritt men guld värt för progressionsanalys. */
  rir?: number;
  warmup?: boolean;
}

export interface WorkoutExercise {
  exerciseId: string;
  sets: SetEntry[];
}

export interface Workout {
  id: string;
  date: ISODate;
  programId?: string;
  dayId?: string;
  name: string;
  exercises: WorkoutExercise[];
  /** Kroppsvikt vid passet, om noterad. */
  bodyweight?: number;
  note?: string;
  createdAt: ISODateTime;
}

/* ------------------------------------------------------------------ */
/* Hela databasen                                                      */
/* ------------------------------------------------------------------ */

export interface HubState {
  receipts: Receipt[];
  holdings: Holding[];
  cashflows: CashFlow[];
  exercises: Exercise[];
  programs: Program[];
  workouts: Workout[];
  /** Schemaversion — gör migrering möjlig när modellen ändras. */
  version: number;
}

export const SCHEMA_VERSION = 1;

export const EMPTY_STATE: HubState = {
  receipts: [],
  holdings: [],
  cashflows: [],
  exercises: [],
  programs: [],
  workouts: [],
  version: SCHEMA_VERSION,
};
