export const runtime = 'nodejs';

/**
 * Kurshämtning.
 *
 * Ärlig varning: gratisnivån hos Finnhub täcker i praktiken amerikanska
 * aktier. Nordiska tickers (ERIC-B.ST, VOLV-B.ST) och svenska fonder kräver
 * betald nivå eller en annan källa. Symboler som inte går att hämta
 * returneras i `failed` — appen värderar dem då till anskaffningsvärde och
 * säger det rakt ut i gränssnittet i stället för att visa en påhittad kurs.
 *
 * Byta leverantör: allt som behövs ligger i `fetchQuote` nedan.
 */

interface Quote {
  symbol: string;
  price: number;
  previousClose?: number;
  changePct?: number;
}

async function fetchQuote(symbol: string, token: string): Promise<Quote | null> {
  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${token}`;
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) return null;

  const data = (await res.json()) as { c?: number; pc?: number; dp?: number };
  // Finnhub svarar 200 med c=0 för symboler man inte har tillgång till.
  if (!data.c || data.c <= 0) return null;

  return {
    symbol,
    price: data.c,
    previousClose: data.pc,
    changePct: data.dp,
  };
}

export async function POST(request: Request) {
  const token = process.env.FINNHUB_API_KEY;
  if (!token) {
    return Response.json(
      {
        error: 'saknar_nyckel',
        message:
          'FINNHUB_API_KEY är inte satt. Kurser matas in manuellt tills den finns. Skaffa en gratis på finnhub.io.',
      },
      { status: 503 },
    );
  }

  const body = (await request.json()) as { symbols?: string[] };
  const symbols = (body.symbols ?? []).filter(Boolean).slice(0, 40);

  if (symbols.length === 0) {
    return Response.json(
      { error: 'inga_symboler', message: 'Skicka minst en ticker i fältet symbols.' },
      { status: 400 },
    );
  }

  const results = await Promise.allSettled(symbols.map((s) => fetchQuote(s, token)));

  const quotes: Quote[] = [];
  const failed: string[] = [];

  results.forEach((result, i) => {
    if (result.status === 'fulfilled' && result.value) quotes.push(result.value);
    else failed.push(symbols[i]);
  });

  return Response.json({
    quotes,
    failed,
    fetchedAt: new Date().toISOString(),
    note:
      failed.length > 0
        ? 'Symboler under "failed" gick inte att hämta — troligen utanför gratisnivån (nordiska tickers och fonder) eller felstavade.'
        : undefined,
  });
}
