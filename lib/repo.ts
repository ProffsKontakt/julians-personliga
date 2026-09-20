import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './supabase/types';
import { SEED_EXERCISES } from './seed';
import {
  EMPTY_STATE,
  type CashFlow,
  type Exercise,
  type Holding,
  type HubState,
  type Receipt,
  type Workout,
} from './types';

export type Db = SupabaseClient<Database>;

/*
 * Kartläggning mellan databasens snake_case och domänmodellens camelCase.
 *
 * Konverteringen ligger samlad här av en anledning: numeric-kolumner kommer
 * tillbaka som strängar från PostgREST när de är stora nog, och det är den
 * sortens fel som annars sipprar ut i gränssnittet som "NaN kr".
 */
const n = (v: unknown): number => (v === null || v === undefined ? 0 : Number(v));
const maybe = (v: unknown): number | undefined =>
  v === null || v === undefined ? undefined : Number(v);

/* ------------------------------------------------------------------ */
/* Läsning                                                             */
/* ------------------------------------------------------------------ */

export async function loadAll(db: Db, userId: string): Promise<HubState> {
  const [receipts, holdings, cashflows, exercises, workouts] = await Promise.all([
    loadReceipts(db),
    db.from('holdings').select('*').order('created_at', { ascending: false }),
    db.from('cashflows').select('*').order('date', { ascending: false }),
    db.from('exercises').select('*').order('name'),
    loadWorkouts(db),
  ]);

  const exerciseRows = exercises.data ?? [];

  // Första inloggningen: lägg in grundbiblioteket så man kan logga ett pass
  // direkt i stället för att först mata in en övningskatalog.
  if (exerciseRows.length === 0) {
    const seeded = await db
      .from('exercises')
      .insert(
        SEED_EXERCISES.map((e) => ({
          user_id: userId,
          name: e.name,
          muscle: e.muscle,
          bodyweight: e.bodyweight ?? false,
        })),
      )
      .select();
    if (seeded.data) exerciseRows.push(...seeded.data);
  }

  return {
    ...EMPTY_STATE,
    receipts,
    holdings: (holdings.data ?? []).map((h) => ({
      id: h.id,
      kind: h.kind,
      name: h.name,
      ticker: h.ticker ?? undefined,
      isin: h.isin ?? undefined,
      quantity: n(h.quantity),
      avgCost: n(h.avg_cost),
      lastPrice: maybe(h.last_price),
      lastPriceAt: h.last_price_at ?? undefined,
      currency: h.currency,
      account: h.account,
      tags: h.tags ?? [],
      createdAt: h.created_at,
      borsapiId: h.borsapi_id ?? undefined,
      borsapiNamn: h.borsapi_namn ?? undefined,
    })),
    cashflows: (cashflows.data ?? []).map((c) => ({
      id: c.id,
      date: c.date,
      amount: n(c.amount),
      type: c.type,
      account: c.account,
      note: c.note ?? undefined,
    })),
    exercises: exerciseRows.map((e) => ({
      id: e.id,
      name: e.name,
      muscle: e.muscle,
      bodyweight: e.bodyweight,
    })),
    workouts,
  };
}

async function loadReceipts(db: Db): Promise<Receipt[]> {
  const { data } = await db
    .from('receipts')
    .select('*, receipt_items(*)')
    .order('purchased_at', { ascending: false });

  return (data ?? []).map((r) => ({
    id: r.id,
    store: r.store,
    purchasedAt: r.purchased_at,
    total: n(r.total),
    // Kolumnen delar enum med innehaven, men ett svenskt matkvitto är alltid
    // i kronor. Domänmodellen håller den snäv med flit.
    currency: 'SEK',
    source: r.source,
    imageKey: r.image_path ?? undefined,
    createdAt: r.created_at,
    note: r.note ?? undefined,
    items: (r.receipt_items ?? []).map((i) => ({
      id: i.id,
      raw: i.raw,
      name: i.name,
      brand: i.brand ?? undefined,
      category: i.category,
      quantity: n(i.quantity),
      unit: i.unit,
      weightGrams: maybe(i.weight_grams),
      volumeMl: maybe(i.volume_ml),
      totalPrice: n(i.total_price),
      discount: maybe(i.discount),
      confidence: maybe(i.confidence),
    })),
  }));
}

async function loadWorkouts(db: Db): Promise<Workout[]> {
  const { data } = await db
    .from('workouts')
    .select('*, workout_sets(*)')
    .order('date', { ascending: false });

  return (data ?? []).map((w) => {
    // Seten ligger platt i databasen. Gruppera per övning och behåll ordningen.
    const byExercise = new Map<string, Workout['exercises'][number]>();
    const sets = [...(w.workout_sets ?? [])].sort((a, b) => a.position - b.position);

    for (const s of sets) {
      const entry = byExercise.get(s.exercise_id) ?? { exerciseId: s.exercise_id, sets: [] };
      entry.sets.push({
        id: s.id,
        weight: n(s.weight),
        reps: s.reps,
        rir: s.rir ?? undefined,
        warmup: s.warmup,
      });
      byExercise.set(s.exercise_id, entry);
    }

    return {
      id: w.id,
      date: w.date,
      name: w.name,
      programId: w.program_id ?? undefined,
      dayId: w.day_id ?? undefined,
      bodyweight: maybe(w.bodyweight),
      note: w.note ?? undefined,
      createdAt: w.created_at,
      exercises: [...byExercise.values()],
    };
  });
}

/* ------------------------------------------------------------------ */
/* Skrivning                                                           */
/* ------------------------------------------------------------------ */

/** Kastar med databasens egen text — den säger mer än ett generiskt fel. */
function check(error: { message: string } | null, vad: string): void {
  if (error) throw new Error(`${vad}: ${error.message}`);
}

export async function insertReceipt(
  db: Db,
  userId: string,
  receipt: Omit<Receipt, 'id' | 'createdAt'>,
): Promise<void> {
  const { data, error } = await db
    .from('receipts')
    .insert({
      user_id: userId,
      store: receipt.store,
      purchased_at: receipt.purchasedAt,
      total: receipt.total,
      currency: receipt.currency,
      source: receipt.source,
      image_path: receipt.imageKey ?? null,
      note: receipt.note ?? null,
    })
    .select('id')
    .single();

  check(error, 'Kunde inte spara kvittot');
  if (!data) throw new Error('Kvittot sparades men gav ingen id tillbaka');

  if (receipt.items.length === 0) return;

  const { error: itemError } = await db.from('receipt_items').insert(
    receipt.items.map((i) => ({
      receipt_id: data.id,
      user_id: userId,
      raw: i.raw,
      name: i.name,
      brand: i.brand ?? null,
      category: i.category,
      quantity: i.quantity,
      unit: i.unit,
      weight_grams: i.weightGrams ?? null,
      volume_ml: i.volumeMl ?? null,
      total_price: i.totalPrice,
      discount: i.discount ?? null,
      confidence: i.confidence ?? null,
    })),
  );

  // Raderna är poängen med kvittot. Går de inte in är ett kvitto utan rader
  // värre än inget — ta bort huvudet så användaren kan försöka igen.
  if (itemError) {
    await db.from('receipts').delete().eq('id', data.id);
    throw new Error(`Kunde inte spara varuraderna: ${itemError.message}`);
  }
}

export async function deleteReceipt(db: Db, id: string): Promise<void> {
  // receipt_items försvinner via on delete cascade.
  const { error } = await db.from('receipts').delete().eq('id', id);
  check(error, 'Kunde inte ta bort kvittot');
}

export async function upsertHolding(db: Db, userId: string, h: Holding): Promise<void> {
  const row = {
    user_id: userId,
    kind: h.kind,
    name: h.name,
    ticker: h.ticker ?? null,
    isin: h.isin ?? null,
    quantity: h.quantity,
    avg_cost: h.avgCost,
    last_price: h.lastPrice ?? null,
    last_price_at: h.lastPriceAt ?? null,
    currency: h.currency,
    account: h.account,
    tags: h.tags,
    borsapi_id: h.borsapiId ?? null,
    borsapi_namn: h.borsapiNamn ?? null,
    borsapi_uppdaterad: h.borsapiId ? new Date().toISOString() : null,
  };

  // Ett id som inte är en uuid betyder att raden är ny och skapad i klienten.
  const existing = isUuid(h.id);
  const { error } = existing
    ? await db.from('holdings').update(row).eq('id', h.id)
    : await db.from('holdings').insert(row);

  check(error, 'Kunde inte spara innehavet');
}

export async function deleteHolding(db: Db, id: string): Promise<void> {
  const { error } = await db.from('holdings').delete().eq('id', id);
  check(error, 'Kunde inte ta bort innehavet');
}

export async function insertCashflow(db: Db, userId: string, c: CashFlow): Promise<void> {
  const { error } = await db.from('cashflows').insert({
    user_id: userId,
    date: c.date,
    amount: c.amount,
    type: c.type,
    account: c.account,
    note: c.note ?? null,
  });
  check(error, 'Kunde inte spara kassaflödet');
}

export async function insertExercise(
  db: Db,
  userId: string,
  e: Omit<Exercise, 'id'>,
): Promise<Exercise> {
  const { data, error } = await db
    .from('exercises')
    .insert({
      user_id: userId,
      name: e.name,
      muscle: e.muscle,
      bodyweight: e.bodyweight ?? false,
    })
    .select()
    .single();

  check(error, 'Kunde inte spara övningen');
  if (!data) throw new Error('Övningen sparades men gav ingen rad tillbaka');

  return { id: data.id, name: data.name, muscle: data.muscle, bodyweight: data.bodyweight };
}

export async function insertWorkout(
  db: Db,
  userId: string,
  workout: Omit<Workout, 'id' | 'createdAt'>,
): Promise<void> {
  const { data, error } = await db
    .from('workouts')
    .insert({
      user_id: userId,
      date: workout.date,
      name: workout.name,
      program_id: workout.programId ?? null,
      day_id: workout.dayId ?? null,
      bodyweight: workout.bodyweight ?? null,
      note: workout.note ?? null,
    })
    .select('id')
    .single();

  check(error, 'Kunde inte spara passet');
  if (!data) throw new Error('Passet sparades men gav ingen id tillbaka');

  const sets = workout.exercises.flatMap((ex) =>
    ex.sets.map((s, i) => ({
      workout_id: data.id,
      user_id: userId,
      exercise_id: ex.exerciseId,
      position: i + 1,
      weight: s.weight,
      reps: s.reps,
      rir: s.rir ?? null,
      warmup: s.warmup ?? false,
    })),
  );

  if (sets.length === 0) return;

  const { error: setError } = await db.from('workout_sets').insert(sets);
  if (setError) {
    await db.from('workouts').delete().eq('id', data.id);
    throw new Error(`Kunde inte spara seten: ${setError.message}`);
  }
}

export async function deleteWorkout(db: Db, id: string): Promise<void> {
  const { error } = await db.from('workouts').delete().eq('id', id);
  check(error, 'Kunde inte ta bort passet');
}

/* ------------------------------------------------------------------ */
/* Kvittobilder                                                        */
/* ------------------------------------------------------------------ */

const BUCKET = 'kvitton';

/** Sökvägen måste börja med user_id — storage-policyn läser första mappnivån. */
export async function uploadReceiptImage(
  db: Db,
  userId: string,
  blob: Blob,
): Promise<string> {
  const path = `${userId}/${crypto.randomUUID()}.jpg`;
  const { error } = await db.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: 'image/jpeg', upsert: false });

  check(error, 'Kunde inte ladda upp kvittobilden');
  return path;
}

/** Tidsbegränsad länk. Bucketen är privat — ingen publik URL finns. */
export async function receiptImageUrl(db: Db, path: string): Promise<string | null> {
  const { data } = await db.storage.from(BUCKET).createSignedUrl(path, 60 * 10);
  return data?.signedUrl ?? null;
}

export async function deleteReceiptImage(db: Db, path: string): Promise<void> {
  await db.storage.from(BUCKET).remove([path]);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
