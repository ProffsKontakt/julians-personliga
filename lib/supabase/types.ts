/**
 * Databastyper.
 *
 * Trimmad version av `supabase gen types typescript`. Raderna är exakta;
 * Insert och Update härleds från Row i stället för att skrivas ut tre gånger
 * per tabell. Regeneras schemat ska den här filen följa med.
 */

export type AccountType = 'ISK' | 'KF' | 'AF' | 'PENSION' | 'ANNAT';
export type CashflowType = 'insattning' | 'uttag' | 'utdelning' | 'avgift';
export type CurrencyCode = 'SEK' | 'USD' | 'EUR' | 'NOK' | 'DKK';
export type HoldingKind = 'aktie' | 'fond' | 'etf' | 'krypto' | 'ranta';
export type ReceiptSource = 'llm' | 'manuell';
export type UnitCode = 'st' | 'g' | 'kg' | 'ml' | 'l' | 'forp';

export type FoodCategoryCode =
  | 'kott' | 'fisk' | 'agg' | 'mejeri' | 'frukt' | 'gronsaker' | 'notter-fron'
  | 'spannmal' | 'fett-olja' | 'dryck' | 'godis-snacks' | 'fardigmat'
  | 'krydda-sas' | 'hushall' | 'ovrigt';

export type MuscleGroupCode =
  | 'brost' | 'rygg' | 'ben' | 'axlar' | 'armar' | 'core' | 'helkropp' | 'kondition';

export type ReceiptRow = {
  id: string;
  user_id: string;
  store: string;
  purchased_at: string;
  total: number;
  currency: CurrencyCode;
  source: ReceiptSource;
  image_path: string | null;
  note: string | null;
  created_at: string;
}

export type ReceiptItemRow = {
  id: string;
  receipt_id: string;
  user_id: string;
  raw: string;
  name: string;
  brand: string | null;
  category: FoodCategoryCode;
  quantity: number;
  unit: UnitCode;
  weight_grams: number | null;
  volume_ml: number | null;
  total_price: number;
  discount: number | null;
  confidence: number | null;
  /** Genererad i databasen — skrivs aldrig av klienten. */
  price_per_kg: number | null;
}

export type HoldingRow = {
  borsapi_id: string | null;
  borsapi_namn: string | null;
  borsapi_uppdaterad: string | null;
  id: string;
  user_id: string;
  kind: HoldingKind;
  name: string;
  ticker: string | null;
  isin: string | null;
  quantity: number;
  avg_cost: number;
  last_price: number | null;
  last_price_at: string | null;
  currency: CurrencyCode;
  account: AccountType;
  tags: string[];
  created_at: string;
}

export type CashflowRow = {
  id: string;
  user_id: string;
  date: string;
  amount: number;
  type: CashflowType;
  account: AccountType;
  note: string | null;
}

export type ExerciseRow = {
  id: string;
  user_id: string;
  name: string;
  muscle: MuscleGroupCode;
  bodyweight: boolean;
}

export type ProgramRow = {
  id: string;
  user_id: string;
  name: string;
  days: unknown;
  archived: boolean;
  created_at: string;
}

export type WorkoutRow = {
  id: string;
  user_id: string;
  date: string;
  name: string;
  program_id: string | null;
  day_id: string | null;
  bodyweight: number | null;
  note: string | null;
  created_at: string;
}

export type WorkoutSetRow = {
  id: string;
  workout_id: string;
  user_id: string;
  exercise_id: string;
  position: number;
  weight: number;
  reps: number;
  rir: number | null;
  warmup: boolean;
}

/*
 * Insert och Update hålls avsiktligt lösa (Record<string, unknown>).
 * Raderna vi bygger för insert konstrueras för hand i lib/repo.ts och
 * typas av Row-typerna ovan; att dessutom härleda exakta Insert-typer
 * gjorde generiken olöslig för supabase-js och allt föll till never.
 */
type Rel = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

/*
 * Relationerna måste deklareras, annars vägrar den typade klienten lösa
 * inbäddade uttryck som `select('*, receipt_items(*)')` och svarar med
 * SelectQueryError i stället för rader.
 */
type Table<Row extends Record<string, unknown>, R extends readonly Rel[] = []> = {
  Row: Row;
  Insert: Record<string, unknown>;
  Update: Record<string, unknown>;
  Relationships: R;
};

const fk = <
  N extends string,
  C extends string,
  T extends string,
>(
  foreignKeyName: N,
  column: C,
  referencedRelation: T,
) => ({
  foreignKeyName,
  columns: [column] as [C],
  isOneToOne: false as const,
  referencedRelation,
  referencedColumns: ['id'] as ['id'],
});

type ReceiptItemRels = [ReturnType<typeof fk<'receipt_items_receipt_id_fkey', 'receipt_id', 'receipts'>>];
type WorkoutSetRels = [
  ReturnType<typeof fk<'workout_sets_exercise_id_fkey', 'exercise_id', 'exercises'>>,
  ReturnType<typeof fk<'workout_sets_workout_id_fkey', 'workout_id', 'workouts'>>,
];
type WorkoutRels = [ReturnType<typeof fk<'workouts_program_id_fkey', 'program_id', 'programs'>>];

export type Database = {
  __InternalSupabase: { PostgrestVersion: '14.5' };
  public: {
    Tables: {
      receipts: Table<ReceiptRow>;
      receipt_items: Table<ReceiptItemRow, ReceiptItemRels>;
      holdings: Table<HoldingRow>;
      cashflows: Table<CashflowRow>;
      exercises: Table<ExerciseRow>;
      programs: Table<ProgramRow>;
      workouts: Table<WorkoutRow, WorkoutRels>;
      workout_sets: Table<WorkoutSetRow, WorkoutSetRels>;
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: {
      account_type: AccountType;
      cashflow_type: CashflowType;
      currency: CurrencyCode;
      food_category: FoodCategoryCode;
      holding_kind: HoldingKind;
      muscle_group: MuscleGroupCode;
      receipt_source: ReceiptSource;
      unit: UnitCode;
    };
    CompositeTypes: { [_ in never]: never };
  };
}
