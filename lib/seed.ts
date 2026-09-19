import type { Exercise } from './types';

/**
 * Grundbibliotek av övningar. Läggs in första gången Kraft öppnas så att
 * man kan logga ett pass direkt utan att först mata in en övningskatalog.
 * Egna övningar läggs till ovanpå och rörs aldrig av det här.
 */
export const SEED_EXERCISES: Exercise[] = [
  // Ben
  { id: 'ex_knabojsp', name: 'Knäböj (skivstång)', muscle: 'ben' },
  { id: 'ex_frontboj', name: 'Frontböj', muscle: 'ben' },
  { id: 'ex_mark', name: 'Marklyft', muscle: 'ben' },
  { id: 'ex_rumanska', name: 'Rumänska marklyft', muscle: 'ben' },
  { id: 'ex_benpress', name: 'Benpress', muscle: 'ben' },
  { id: 'ex_utfall', name: 'Utfall', muscle: 'ben' },
  { id: 'ex_benspark', name: 'Benspark', muscle: 'ben' },
  { id: 'ex_lagcurl', name: 'Lårcurl', muscle: 'ben' },
  { id: 'ex_vadpress', name: 'Vadpress', muscle: 'ben' },

  // Bröst
  { id: 'ex_banksp', name: 'Bänkpress', muscle: 'brost' },
  { id: 'ex_lutbank', name: 'Lutande bänkpress', muscle: 'brost' },
  { id: 'ex_hantelbank', name: 'Hantelpress', muscle: 'brost' },
  { id: 'ex_flyes', name: 'Flyes', muscle: 'brost' },
  { id: 'ex_dips', name: 'Dips', muscle: 'brost', bodyweight: true },

  // Rygg
  { id: 'ex_chins', name: 'Chins', muscle: 'rygg', bodyweight: true },
  { id: 'ex_latsdrag', name: 'Latsdrag', muscle: 'rygg' },
  { id: 'ex_skivrodd', name: 'Skivstångsrodd', muscle: 'rygg' },
  { id: 'ex_hantelrodd', name: 'Hantelrodd', muscle: 'rygg' },
  { id: 'ex_kabelrodd', name: 'Kabelrodd', muscle: 'rygg' },
  { id: 'ex_facepull', name: 'Face pull', muscle: 'rygg' },

  // Axlar
  { id: 'ex_militar', name: 'Militärpress', muscle: 'axlar' },
  { id: 'ex_hantelpress', name: 'Axelpress hantlar', muscle: 'axlar' },
  { id: 'ex_sidolyft', name: 'Sidolyft', muscle: 'axlar' },
  { id: 'ex_bakaxel', name: 'Bakre axellyft', muscle: 'axlar' },

  // Armar
  { id: 'ex_bicepscurl', name: 'Bicepscurl', muscle: 'armar' },
  { id: 'ex_hammarcurl', name: 'Hammarcurl', muscle: 'armar' },
  { id: 'ex_tricepspress', name: 'Tricepspress', muscle: 'armar' },
  { id: 'ex_skullcrusher', name: 'Skullcrusher', muscle: 'armar' },

  // Core / kondition
  { id: 'ex_planka', name: 'Planka', muscle: 'core', bodyweight: true },
  { id: 'ex_hanging', name: 'Hängande benlyft', muscle: 'core', bodyweight: true },
  { id: 'ex_rullhjul', name: 'Bukhjul', muscle: 'core', bodyweight: true },
  { id: 'ex_lopband', name: 'Löpning', muscle: 'kondition', bodyweight: true },
  { id: 'ex_rodmaskin', name: 'Roddmaskin', muscle: 'kondition', bodyweight: true },
];

export const MUSCLE_LABELS: Record<Exercise['muscle'], string> = {
  brost: 'Bröst',
  rygg: 'Rygg',
  ben: 'Ben',
  axlar: 'Axlar',
  armar: 'Armar',
  core: 'Core',
  helkropp: 'Helkropp',
  kondition: 'Kondition',
};
