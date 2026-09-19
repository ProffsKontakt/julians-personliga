import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

/**
 * Landningspunkt för inloggningslänken i mejlet.
 * Växlar engångskoden mot en session och skickar vidare.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  // Öppen omdirigering är en riktig sårbarhet: en länk med
  // ?next=https://exempel.se skulle annars skicka användaren dit med
  // sessionen nyss satt. Bara interna sökvägar tillåts.
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/';

  if (!code) {
    return NextResponse.redirect(`${origin}/login?fel=ingen_kod`);
  }

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?fel=utgangen`);
  }

  return NextResponse.redirect(`${origin}${safeNext}`);
}
