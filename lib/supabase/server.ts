import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from './types';

/**
 * Supabase-klient för serverkomponenter och rutthanterare.
 *
 * Använder samma publika nyckel som webbläsaren — sessionen kommer från
 * kakan, och RLS gör resten. Ingen secret-nyckel behövs någonstans i appen.
 */
export async function supabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL och NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY måste vara satta.',
    );
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Serverkomponenter får inte sätta kakor. Middleware sköter
          // sessionsförnyelsen, så det här är förväntat och ofarligt.
        }
      },
    },
  });
}
