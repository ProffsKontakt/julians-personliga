'use client';

import { Block, Button, Sheet } from 'konsta/react';
import { useEffect, useMemo, useState } from 'react';
import { LineChart, ColumnChart } from '@/components/charts';
import { IconCheck, IconPlus, IconTrash } from '@/components/icons';
import Shell from '@/components/Shell';
import { EmptyState, GlassCard, Inset, Row, SectionTitle, StatTile, Tabs } from '@/components/ui';
import { estimate1RM, progressFor, weeklyLoad, workoutVolume } from '@/lib/analytics';
import { MUSCLE_LABELS, SEED_EXERCISES } from '@/lib/seed';
import { useStore } from '@/lib/store';
import type { Exercise, SetEntry, Workout, WorkoutExercise } from '@/lib/types';
import { num, today, uid } from '@/lib/utils';

type View = 'logga' | 'progression' | 'historik';

export default function KraftPage() {
  const { state, ready, update } = useStore();
  const [view, setView] = useState<View>('logga');

  // Första besöket: lägg in grundbiblioteket så man kan logga direkt.
  useEffect(() => {
    if (!ready || state.exercises.length > 0) return;
    update((s) => (s.exercises.length > 0 ? s : { ...s, exercises: SEED_EXERCISES }));
  }, [ready, state.exercises.length, update]);

  const workouts = state.workouts;
  const weeks = useMemo(() => weeklyLoad(workouts), [workouts]);
  const last = workouts[0];

  return (
    <Shell
      title="Kraft"
      subtitle={ready ? `${workouts.length} loggade pass` : 'Läser…'}
    >
      <Block className="!mt-3 !mb-0">
        <Tabs
          value={view}
          onChange={setView}
          options={
            [
              ['logga', 'Logga'],
            ['progression', 'Progression'],
            ['historik', 'Historik'],
            ] as const
          }
        />
      </Block>

      {view === 'logga' && <Logger />}

      {view === 'progression' && (
        <Progression workouts={workouts} exercises={state.exercises} />
      )}

      {view === 'historik' && (
        <History
          workouts={workouts}
          exercises={state.exercises}
          weeks={weeks}
          lastVolume={last ? workoutVolume(last) : 0}
          onRemove={(id) =>
            update((s) => ({ ...s, workouts: s.workouts.filter((w) => w.id !== id) }))
          }
        />
      )}
    </Shell>
  );
}

/* ------------------------------------------------------------------ */
/* Logger — det aktiva passet                                          */
/* ------------------------------------------------------------------ */

function Logger() {
  const { state, update } = useStore();
  const [name, setName] = useState('');
  const [entries, setEntries] = useState<WorkoutExercise[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  const byId = useMemo(
    () => new Map(state.exercises.map((e) => [e.id, e])),
    [state.exercises],
  );

  /** Senaste loggade set för en övning — referenspunkten när man laddar stången. */
  function lastTime(exerciseId: string): SetEntry | undefined {
    for (const workout of state.workouts) {
      const ex = workout.exercises.find((e) => e.exerciseId === exerciseId);
      const working = ex?.sets.filter((s) => !s.warmup);
      if (working && working.length > 0) {
        return working.reduce((best, s) =>
          estimate1RM(s.weight, s.reps) > estimate1RM(best.weight, best.reps) ? s : best,
        );
      }
    }
    return undefined;
  }

  function addExercise(exercise: Exercise) {
    if (entries.some((e) => e.exerciseId === exercise.id)) return;
    const previous = lastTime(exercise.id);
    setEntries((prev) => [
      ...prev,
      {
        exerciseId: exercise.id,
        sets: [
          {
            id: uid('s'),
            weight: previous?.weight ?? 0,
            reps: previous?.reps ?? 8,
          },
        ],
      },
    ]);
    setPickerOpen(false);
  }

  function updateSet(exerciseId: string, setId: string, patch: Partial<SetEntry>) {
    setEntries((prev) =>
      prev.map((e) =>
        e.exerciseId === exerciseId
          ? { ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) }
          : e,
      ),
    );
  }

  function addSet(exerciseId: string) {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.exerciseId !== exerciseId) return e;
        const previous = e.sets[e.sets.length - 1];
        return {
          ...e,
          sets: [
            ...e.sets,
            { id: uid('s'), weight: previous?.weight ?? 0, reps: previous?.reps ?? 8 },
          ],
        };
      }),
    );
  }

  function removeSet(exerciseId: string, setId: string) {
    setEntries((prev) =>
      prev
        .map((e) =>
          e.exerciseId === exerciseId ? { ...e, sets: e.sets.filter((s) => s.id !== setId) } : e,
        )
        .filter((e) => e.sets.length > 0),
    );
  }

  const volume = entries.reduce(
    (total, e) =>
      total + e.sets.filter((s) => !s.warmup).reduce((a, s) => a + s.weight * s.reps, 0),
    0,
  );
  const totalSets = entries.reduce((a, e) => a + e.sets.length, 0);
  const canSave = entries.length > 0 && entries.some((e) => e.sets.some((s) => s.reps > 0));

  function save() {
    if (!canSave) return;
    const workout: Workout = {
      id: uid('w'),
      date: today(),
      name: name.trim() || 'Pass',
      exercises: entries,
      createdAt: new Date().toISOString(),
    };
    update((s) => ({ ...s, workouts: [workout, ...s.workouts] }));
    setEntries([]);
    setName('');
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <Block className="!mt-0 space-y-0">
      {saved && (
        <GlassCard className="mt-3 flex items-center gap-3" shine={false}>
          <IconCheck className="w-5 h-5 text-[#26c185]" />
          <p className="text-[14px] text-white/80">Passet sparat.</p>
        </GlassCard>
      )}

      <SectionTitle>Dagens pass</SectionTitle>
      <GlassCard className="space-y-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Push A, Ben, Helkropp…"
          className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-[16px] text-white outline-none placeholder:text-white/30 focus:border-[#0a84ff]/60"
        />
        <div className="flex gap-3 text-[13px] text-white/45">
          <span className="tnum">{entries.length} övningar</span>
          <span className="tnum">{totalSets} set</span>
          <span className="tnum">{num(volume)} kg volym</span>
        </div>
      </GlassCard>

      {entries.length === 0 ? (
        <div className="mt-3">
          <EmptyState
            title="Tomt pass"
            body="Lägg till en övning. Vikt och reps förifylls med ditt bästa set senast — utgångspunkten för att lägga på lite."
            action={
              <Button rounded onClick={() => setPickerOpen(true)} className="mt-2">
                Lägg till övning
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          {entries.map((entry) => {
            const exercise = byId.get(entry.exerciseId);
            const previous = lastTime(entry.exerciseId);
            return (
              <GlassCard key={entry.exerciseId} className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-[16px] font-semibold text-white">
                      {exercise?.name ?? 'Okänd övning'}
                    </h3>
                    <p className="text-[12px] text-white/40">
                      {exercise ? MUSCLE_LABELS[exercise.muscle] : ''}
                      {previous ? ` · senast ${previous.weight} kg × ${previous.reps}` : ' · första gången'}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setEntries((prev) => prev.filter((e) => e.exerciseId !== entry.exerciseId))
                    }
                    className="p-1 text-white/25 active:text-[#fa6a22]"
                    aria-label={`Ta bort ${exercise?.name}`}
                  >
                    <IconTrash className="w-5 h-5" />
                  </button>
                </div>

                <Inset className="divide-y divide-white/[0.06]">
                  {entry.sets.map((set, i) => {
                    const est = estimate1RM(set.weight, set.reps);
                    return (
                      <div key={set.id} className="flex items-center gap-2 p-2.5">
                        <span className="w-6 shrink-0 text-center text-[13px] font-medium text-white/35">
                          {i + 1}
                        </span>
                        <NumberField
                          value={set.weight}
                          suffix="kg"
                          step={2.5}
                          onChange={(weight) => updateSet(entry.exerciseId, set.id, { weight })}
                        />
                        <span className="text-white/25">×</span>
                        <NumberField
                          value={set.reps}
                          suffix="rep"
                          step={1}
                          onChange={(reps) => updateSet(entry.exerciseId, set.id, { reps })}
                        />
                        <span className="tnum w-16 shrink-0 text-right text-[12px] text-white/35">
                          {est > 0 ? `${est.toFixed(0)} 1RM` : ''}
                        </span>
                        <button
                          onClick={() => removeSet(entry.exerciseId, set.id)}
                          className="shrink-0 px-1 text-white/20 active:text-[#fa6a22]"
                          aria-label={`Ta bort set ${i + 1}`}
                        >
                          <IconTrash className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </Inset>

                <button
                  onClick={() => addSet(entry.exerciseId)}
                  className="w-full rounded-2xl border border-dashed border-white/15 py-2.5 text-[14px] font-medium text-[#0a84ff] active:bg-white/[0.05]"
                >
                  + Set
                </button>
              </GlassCard>
            );
          })}

          <Button rounded outline onClick={() => setPickerOpen(true)}>
            <span className="flex items-center gap-2">
              <IconPlus className="w-5 h-5" /> Lägg till övning
            </span>
          </Button>

          <Button large rounded onClick={save} disabled={!canSave}>
            Spara passet
          </Button>
        </div>
      )}

      <ExercisePicker
        opened={pickerOpen}
        exercises={state.exercises}
        taken={entries.map((e) => e.exerciseId)}
        onPick={addExercise}
        onClose={() => setPickerOpen(false)}
        onCreate={(exercise) => {
          update((s) => ({ ...s, exercises: [...s.exercises, exercise] }));
          addExercise(exercise);
        }}
      />
    </Block>
  );
}

/** Steppar i rimliga kliv och låter ändå tangentbordet skriva exakt värde. */
function NumberField({
  value,
  onChange,
  step,
  suffix,
}: {
  value: number;
  onChange: (n: number) => void;
  step: number;
  suffix: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-1 rounded-xl bg-white/[0.07]">
      <button
        onClick={() => onChange(Math.max(0, +(value - step).toFixed(2)))}
        className="w-7 shrink-0 py-2 text-[16px] text-white/45 active:text-white"
        aria-label={`Minska ${suffix}`}
      >
        −
      </button>
      <input
        inputMode="decimal"
        value={value === 0 ? '' : String(value)}
        placeholder="0"
        onChange={(e) => {
          const parsed = parseFloat(e.target.value.replace(',', '.'));
          onChange(Number.isFinite(parsed) ? parsed : 0);
        }}
        className="tnum w-full min-w-0 bg-transparent py-2 text-center text-[15px] text-white outline-none placeholder:text-white/25"
        aria-label={suffix}
      />
      <button
        onClick={() => onChange(+(value + step).toFixed(2))}
        className="w-7 shrink-0 py-2 text-[16px] text-white/45 active:text-white"
        aria-label={`Öka ${suffix}`}
      >
        +
      </button>
    </div>
  );
}

function ExercisePicker({
  opened,
  exercises,
  taken,
  onPick,
  onClose,
  onCreate,
}: {
  opened: boolean;
  exercises: Exercise[];
  taken: string[];
  onPick: (e: Exercise) => void;
  onClose: () => void;
  onCreate: (e: Exercise) => void;
}) {
  const [query, setQuery] = useState('');

  const filtered = exercises.filter((e) =>
    e.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const grouped = filtered.reduce<Record<string, Exercise[]>>((acc, e) => {
    (acc[e.muscle] ??= []).push(e);
    return acc;
  }, {});

  const canCreate = query.trim().length > 1 && filtered.length === 0;

  return (
    <Sheet opened={opened} onBackdropClick={onClose} className="max-h-[85vh] overflow-auto">
      <div className="p-4">
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-white/25" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Sök övning…"
          className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-[16px] text-white outline-none placeholder:text-white/30 focus:border-[#0a84ff]/60"
        />

        {canCreate && (
          <Button
            rounded
            className="mt-3"
            onClick={() => {
              onCreate({ id: uid('ex'), name: query.trim(), muscle: 'helkropp' });
              setQuery('');
            }}
          >
            Skapa &quot;{query.trim()}&quot;
          </Button>
        )}

        <div className="mt-4 space-y-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {Object.entries(grouped).map(([muscle, list]) => (
            <div key={muscle}>
              <h3 className="px-1 pb-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-white/40">
                {MUSCLE_LABELS[muscle as Exercise['muscle']]}
              </h3>
              <Inset className="divide-y divide-white/[0.06]">
                {list.map((exercise) => (
                  <button
                    key={exercise.id}
                    onClick={() => onPick(exercise)}
                    disabled={taken.includes(exercise.id)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left disabled:opacity-35 active:bg-white/[0.06]"
                  >
                    <span className="text-[15px] text-white">{exercise.name}</span>
                    {taken.includes(exercise.id) && (
                      <IconCheck className="w-5 h-5 text-[#26c185]" />
                    )}
                  </button>
                ))}
              </Inset>
            </div>
          ))}
        </div>
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */

function Progression({
  workouts,
  exercises,
}: {
  workouts: Workout[];
  exercises: Exercise[];
}) {
  // Bara övningar med minst två loggade tillfällen kan visa en kurva.
  const trackable = useMemo(() => {
    const counts = new Map<string, number>();
    for (const w of workouts) {
      for (const e of w.exercises) {
        if (e.sets.some((s) => !s.warmup && s.reps > 0)) {
          counts.set(e.exerciseId, (counts.get(e.exerciseId) ?? 0) + 1);
        }
      }
    }
    return exercises
      .filter((e) => (counts.get(e.id) ?? 0) >= 1)
      .map((e) => ({ exercise: e, sessions: counts.get(e.id) ?? 0 }))
      .sort((a, b) => b.sessions - a.sessions);
  }, [workouts, exercises]);

  const [selected, setSelected] = useState<string | null>(null);
  const active = selected ?? trackable[0]?.exercise.id ?? null;
  const series = useMemo(
    () => (active ? progressFor(workouts, active) : []),
    [workouts, active],
  );

  if (trackable.length === 0) {
    return (
      <Block className="!mt-6">
        <EmptyState
          title="Inget att jämföra än"
          body="Logga ett pass först. När samma övning finns i minst två pass ritas kurvan upp."
        />
      </Block>
    );
  }

  const first = series[0];
  const latest = series[series.length - 1];

  // Kroppsviktsövningar har vikt 0. Då säger 1RM ingenting — mät reps i stället.
  const unloaded = series.length > 0 && series.every((p) => p.best1RM === 0);
  const metric = unloaded
    ? { title: 'Reps per pass', pick: (p: typeof series[number]) => p.totalReps, unit: 'reps' }
    : { title: 'Beräknat 1RM', pick: (p: typeof series[number]) => p.best1RM, unit: 'kg' };

  const firstValue = first ? metric.pick(first) : 0;
  const lastValue = latest ? metric.pick(latest) : 0;
  const change = firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;

  return (
    <Block className="!mt-0 space-y-0">
      <SectionTitle>Övning</SectionTitle>
      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex gap-2 pb-1">
          {trackable.map(({ exercise, sessions }) => (
            <button
              key={exercise.id}
              onClick={() => setSelected(exercise.id)}
              className={`shrink-0 rounded-full border px-3.5 py-2 text-[13px] font-medium transition-colors ${
                active === exercise.id
                  ? 'border-[#0a84ff]/50 bg-[#0a84ff]/20 text-white'
                  : 'border-white/10 bg-white/[0.05] text-white/55'
              }`}
            >
              {exercise.name}
              <span className="tnum ml-1.5 text-white/35">{sessions}</span>
            </button>
          ))}
        </div>
      </div>

      {series.length >= 2 ? (
        <>
          <SectionTitle>{metric.title}</SectionTitle>
          <GlassCard>
            <LineChart
              data={series.map((p) => ({ label: p.date.slice(5), value: metric.pick(p) }))}
              format={(n) => (unloaded ? `${n.toFixed(0)} reps` : `${n.toFixed(1)} kg`)}
            />
          </GlassCard>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <StatTile
              label="Sedan start"
              value={`${change >= 0 ? '+' : ''}${change.toFixed(1)} %`}
              tone={change >= 0 ? 'up' : 'down'}
              hint={`${firstValue.toFixed(0)} → ${lastValue.toFixed(0)} ${metric.unit}`}
            />
            <StatTile
              label="Bästa set"
              value={
                unloaded
                  ? `${latest.topSet.reps} reps`
                  : `${latest.topSet.weight} × ${latest.topSet.reps}`
              }
              hint={latest.date}
            />
          </div>

          {!unloaded && (
            <>
              <SectionTitle>Volym per tillfälle</SectionTitle>
              <GlassCard>
                <ColumnChart
                  data={series.map((p) => ({ label: p.date.slice(5), value: p.volume }))}
                  format={(n) => `${num(n)} kg`}
                  color="#bf5af0"
                />
              </GlassCard>
            </>
          )}

          <p className="px-1 pt-3 text-[12px] leading-relaxed text-white/35">
            {unloaded
              ? 'Övningen är loggad utan extern belastning, så 1RM och volym säger ingenting. Kurvan visar reps per pass i stället. Lägg in viktbältet som vikt om du börjar belasta.'
              : '1RM skattas med Epley (vikt × (1 + reps/30)). Formeln är rimlig upp till ungefär tio reps och spretar därefter — jämför set i samma repintervall när du läser kurvan.'}
          </p>
        </>
      ) : (
        <div className="mt-4">
          <EmptyState
            title="Ett tillfälle loggat"
            body="Kurvan kräver minst två pass med samma övning. Logga den igen så ritas den upp."
          />
        </div>
      )}
    </Block>
  );
}

function History({
  workouts,
  exercises,
  weeks,
  lastVolume,
  onRemove,
}: {
  workouts: Workout[];
  exercises: Exercise[];
  weeks: ReturnType<typeof weeklyLoad>;
  lastVolume: number;
  onRemove: (id: string) => void;
}) {
  const byId = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);

  if (workouts.length === 0) {
    return (
      <Block className="!mt-6">
        <EmptyState title="Ingen historik" body="Logga ditt första pass under fliken Logga." />
      </Block>
    );
  }

  const totalVolume = workouts.reduce((a, w) => a + workoutVolume(w), 0);

  return (
    <Block className="!mt-0 space-y-0">
      <SectionTitle>Belastning</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Senaste passet" value={`${num(lastVolume)} kg`} />
        <StatTile
          label="Total volym"
          value={`${num(totalVolume / 1000, 1)} ton`}
          hint={`${workouts.length} pass`}
        />
      </div>

      {weeks.length >= 2 && (
        <>
          <SectionTitle>Volym per vecka</SectionTitle>
          <GlassCard>
            <ColumnChart
              data={weeks.map((w) => ({ label: w.week.split('-')[1], value: w.volume }))}
              format={(n) => `${num(n)} kg`}
              color="#26c185"
            />
          </GlassCard>
        </>
      )}

      <SectionTitle>Pass</SectionTitle>
      <div className="space-y-3">
        {workouts.map((workout) => (
          <GlassCard key={workout.id} className="!p-0 overflow-hidden">
            <div className="flex items-start justify-between gap-3 p-4 pb-2">
              <div className="min-w-0">
                <p className="truncate text-[16px] font-semibold text-white">{workout.name}</p>
                <p className="text-[12px] text-white/40">
                  {workout.date} · {num(workoutVolume(workout))} kg ·{' '}
                  {workout.exercises.reduce((a, e) => a + e.sets.length, 0)} set
                </p>
              </div>
              <button
                onClick={() => onRemove(workout.id)}
                className="p-1.5 text-white/25 active:text-[#fa6a22]"
                aria-label={`Ta bort ${workout.name}`}
              >
                <IconTrash className="w-5 h-5" />
              </button>
            </div>
            <ul className="hair-t divide-y divide-white/[0.06]">
              {workout.exercises.map((entry) => (
                <li key={entry.exerciseId}>
                  <Row
                    label={byId.get(entry.exerciseId)?.name ?? 'Okänd övning'}
                    sub={entry.sets
                      .map((s) => `${s.weight}×${s.reps}`)
                      .join('  ·  ')}
                    value={`${num(
                      entry.sets.filter((s) => !s.warmup).reduce((a, s) => a + s.weight * s.reps, 0),
                    )} kg`}
                  />
                </li>
              ))}
            </ul>
          </GlassCard>
        ))}
      </div>
    </Block>
  );
}
