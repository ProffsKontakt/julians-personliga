import { borsapiFel, sokBolag } from '@/lib/borsapi';
import { requireUser } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/** Bolagssökning. Nyckeln stannar på servern och når aldrig webbläsaren. */
export async function GET(request: Request) {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const fraga = new URL(request.url).searchParams.get('q')?.trim() ?? '';

    // Sökningen kostar kvot. Enstaka bokstäver ger ändå oanvändbara träffar.
    if (fraga.length < 2) {
      return Response.json({ bolag: [] });
    }

    return Response.json({ bolag: await sokBolag(fraga, 10) });
  } catch (error) {
    return borsapiFel(error);
  }
}
