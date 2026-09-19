import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from './types';

/** Sidor som får besökas utan session. Allt annat kräver inloggning. */
const OPEN_PATHS = ['/login', '/auth'];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // Saknas konfigurationen går vi vidare orörda. Att låsa ute användaren
  // för att en miljövariabel fattas gör felsökningen onödigt svår.
  if (!url || !key) return response;

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getUser(), inte getSession(): den förra verifierar token mot Supabase.
  // getSession() läser bara kakan, som klienten kan ha hittat på.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isOpen = OPEN_PATHS.some((p) => path === p || path.startsWith(p + '/'));

  if (!user && !isOpen) {
    const login = request.nextUrl.clone();
    login.pathname = '/login';
    // Spara vart användaren var på väg, så hen landar rätt efter inloggning.
    login.searchParams.set('next', path);
    return NextResponse.redirect(login);
  }

  if (user && path === '/login') {
    const home = request.nextUrl.clone();
    home.pathname = '/';
    home.search = '';
    return NextResponse.redirect(home);
  }

  return response;
}
