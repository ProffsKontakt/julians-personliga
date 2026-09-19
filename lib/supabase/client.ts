'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

/**
 * Supabase-klient för webbläsaren.
 *
 * Nyckeln här är publik med flit — den ligger i bundlen och ska göra det.
 * Säkerheten kommer från radnivåsäkerheten i databasen, som bara släpper
 * igenom rader som tillhör den inloggade sessionen. Utan giltig session
 * kommer nyckeln ingenstans.
 */
export function supabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL och NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY måste vara satta.',
    );
  }

  return createBrowserClient<Database>(url, key);
}
