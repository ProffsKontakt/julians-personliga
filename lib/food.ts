import type { FoodCategory } from './types';

/**
 * Kategorimetadata.
 *
 * `tier` är en medveten värdering, inte en naturlag:
 *   - 'satsa'  — näringstätt per krona; här är mer sällan ett problem
 *   - 'neutral'— beror helt på vad man gör av det
 *   - 'skar-ner' — där pengarna oftast läcker utan att ge något tillbaka
 *
 * Ändra fritt. Det är din hubb, inte en kostrekommendation.
 */
export type Tier = 'satsa' | 'neutral' | 'skar-ner';

export interface CategoryMeta {
  label: string;
  icon: string;
  tier: Tier;
  /** Tailwind-färg för diagram och chips. */
  color: string;
}

export const CATEGORY_META: Record<FoodCategory, CategoryMeta> = {
  kott: { label: 'Kött', icon: '🥩', tier: 'satsa', color: '#ff375f' },
  fisk: { label: 'Fisk & skaldjur', icon: '🐟', tier: 'satsa', color: '#40c8e0' },
  agg: { label: 'Ägg', icon: '🥚', tier: 'satsa', color: '#ffd60a' },
  mejeri: { label: 'Mejeri', icon: '🥛', tier: 'satsa', color: '#64d2ff' },
  frukt: { label: 'Frukt', icon: '🍎', tier: 'satsa', color: '#ff9f0a' },
  gronsaker: { label: 'Grönsaker', icon: '🥦', tier: 'satsa', color: '#30d158' },
  'notter-fron': { label: 'Nötter & frön', icon: '🥜', tier: 'satsa', color: '#bf8040' },
  spannmal: { label: 'Spannmål', icon: '🌾', tier: 'neutral', color: '#d2b48c' },
  'fett-olja': { label: 'Fett & olja', icon: '🫒', tier: 'neutral', color: '#a3c940' },
  dryck: { label: 'Dryck', icon: '🥤', tier: 'skar-ner', color: '#5e5ce6' },
  'godis-snacks': { label: 'Godis & snacks', icon: '🍫', tier: 'skar-ner', color: '#ff453a' },
  fardigmat: { label: 'Färdigmat', icon: '🍕', tier: 'skar-ner', color: '#ff6482' },
  'krydda-sas': { label: 'Kryddor & sås', icon: '🧂', tier: 'neutral', color: '#8e8e93' },
  hushall: { label: 'Hushåll', icon: '🧻', tier: 'neutral', color: '#98989d' },
  ovrigt: { label: 'Övrigt', icon: '📦', tier: 'neutral', color: '#636366' },
};

export const TIER_META: Record<Tier, { label: string; color: string }> = {
  satsa: { label: 'Satsa på', color: '#30d158' },
  neutral: { label: 'Neutralt', color: '#8e8e93' },
  'skar-ner': { label: 'Skär ner', color: '#ff453a' },
};

export function meta(category: FoodCategory): CategoryMeta {
  return CATEGORY_META[category] ?? CATEGORY_META.ovrigt;
}
