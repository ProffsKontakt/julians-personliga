import type Anthropic from '@anthropic-ai/sdk';
import { client, errorResponse, MODEL } from '@/lib/anthropic';
import { requireUser } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface BriefRequest {
  holdings: {
    name: string;
    ticker?: string;
    kind: string;
    share: number; // andel av portföljen, 0–1
    currency: string;
    tags: string[];
  }[];
  totalValue: number;
}

const SYSTEM = `Du är en marknadsanalytiker som skriver en kort lägesbild för en
privat svensk investerare. Du har webbsökning — använd den, och bygg varje påstående
om läget på något du faktiskt hittat, inte på minnet.

Skriv på svenska. Följ EXAKT den här strukturen, inga andra rubriker:

## Läget
Två till fyra meningar om vad som faktiskt rör marknaden just nu och som berör
den här portföljen. Datum och siffror där du har dem.

## Mot dig
Vad i omvärlden som talar EMOT innehaven. Punktlista. Varje punkt: vilket innehav
eller tema det gäller, och varför. Var konkret — "räntebanan" är inte en risk,
"Riksbanken signalerar höjning i december, vilket pressar bolag X som lånar kort" är det.

## För dig
Samma sak fast medvind. Punktlista.

## Vad jag skulle titta på
Två till fyra konkreta saker. Inte "diversifiera mer" — säg vad, och varför just nu.

## Osäkerheter
Vad du INTE kunde verifiera, och var du gissar.

REGLER
- Du ger inte investeringsrådgivning. Du beskriver läget och risker. Säg aldrig
  "köp" eller "sälj" — beskriv vad som talar för och emot.
- Hittar du ingen färsk information om ett innehav: säg det, hitta inte på.
- Inga brasklappar i stil med "konsultera en rådgivare". Användaren vet det.
- Inga generiska floskler. Varje mening ska bära information.`;

export async function POST(request: Request) {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const body = (await request.json()) as BriefRequest;

    if (!Array.isArray(body.holdings) || body.holdings.length === 0) {
      return Response.json(
        { error: 'tom_portfolj', message: 'Lägg in minst ett innehav först.' },
        { status: 400 },
      );
    }

    const portfolio = body.holdings
      .slice(0, 40)
      .map(
        (h) =>
          `- ${h.name}${h.ticker ? ` (${h.ticker})` : ''} · ${h.kind} · ${(h.share * 100).toFixed(1)} % av portföljen · ${h.currency}${
            h.tags.length ? ` · teman: ${h.tags.join(', ')}` : ''
          }`,
      )
      .join('\n');

    const anthropic = client();
    const messages: Anthropic.MessageParam[] = [
      {
        role: 'user',
        content: `Dagens datum: ${new Date().toISOString().slice(0, 10)}.

Portfölj (totalt ca ${Math.round(body.totalValue).toLocaleString('sv-SE')} SEK):
${portfolio}

Sök upp vad som händer i omvärlden som berör de här innehaven och skriv lägesbilden.`,
      },
    ];

    // Webbsökningsturer kan pausa. Återuppta tills modellen är klar,
    // med tak så att en lång sökkedja inte äter hela budgeten.
    let response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM,
      tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 8 }],
      messages,
    });

    let guard = 0;
    while (response.stop_reason === 'pause_turn' && guard < 4) {
      guard += 1;
      messages.push({ role: 'assistant', content: response.content });
      response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 16000,
        system: SYSTEM,
        tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 8 }],
        messages,
      });
    }

    if (response.stop_reason === 'refusal') {
      return Response.json(
        { error: 'avvisad', message: 'Modellen avböjde att svara på den här frågan.' },
        { status: 422 },
      );
    }

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();

    // Källor: web_search-resultat kommer som egna innehållsblock, inte som
    // undantag. Ett fel ger ett objekt i stället för en lista — kolla det först.
    const sources: { title: string; url: string }[] = [];
    for (const block of response.content) {
      if (block.type !== 'web_search_tool_result') continue;
      if (!Array.isArray(block.content)) continue;
      for (const result of block.content) {
        if (result.type === 'web_search_result') {
          sources.push({ title: result.title, url: result.url });
        }
      }
    }

    if (!text) {
      return Response.json(
        { error: 'tomt_svar', message: 'Modellen returnerade ingen text. Försök igen.' },
        { status: 502 },
      );
    }

    return Response.json({
      brief: text,
      sources: sources.slice(0, 20),
      generatedAt: new Date().toISOString(),
      truncated: response.stop_reason === 'max_tokens' || response.stop_reason === 'pause_turn',
    });
  } catch (error) {
    return errorResponse(error);
  }
}
