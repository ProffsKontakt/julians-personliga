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

/**
 * Kräver en giltig session. Returnerar ett färdigt 401-svar om den saknas.
 *
 * Middleware stoppar redan anonyma anrop mot /api/, men de här rutterna
 * kostar pengar per anrop. Att lita på ett enda lager för det är att göra
 * en konfigurationsmiss till en faktura.
 */
export async function requireUser(): Promise<
  { ok: true; userId: string } | { ok: false; response: Response }
> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: Response.json(
        { error: 'ej_inloggad', message: 'Du måste vara inloggad för att använda den här rutten.' },
        { status: 401 },
      ),
    };
  }

  return { ok: true, userId: user.id };
}
