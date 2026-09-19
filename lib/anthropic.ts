import Anthropic from '@anthropic-ai/sdk';

/** Modellen hela hubben använder. Ett ställe att byta på. */
export const MODEL = 'claude-opus-5';

export class MissingKeyError extends Error {
  constructor() {
    super('ANTHROPIC_API_KEY saknas');
    this.name = 'MissingKeyError';
  }
}

export function client(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new MissingKeyError();
  return new Anthropic();
}

/** Enhetligt felsvar så att klienten slipper gissa vad som gick fel. */
export function errorResponse(error: unknown): Response {
  if (error instanceof MissingKeyError) {
    return Response.json(
      {
        error: 'saknar_nyckel',
        message:
          'ANTHROPIC_API_KEY är inte satt. Lägg den i Vercels environment variables (eller .env.local) och deploya om. Tills dess får du mata in data för hand.',
      },
      { status: 503 },
    );
  }
  if (error instanceof Anthropic.RateLimitError) {
    return Response.json(
      { error: 'rate_limit', message: 'För många anrop mot Anthropic just nu. Försök igen strax.' },
      { status: 429 },
    );
  }
  if (error instanceof Anthropic.AuthenticationError) {
    return Response.json(
      { error: 'fel_nyckel', message: 'ANTHROPIC_API_KEY avvisades. Kontrollera nyckeln.' },
      { status: 401 },
    );
  }
  if (error instanceof Anthropic.APIError) {
    return Response.json(
      { error: 'api_fel', message: `Anthropic svarade ${error.status}: ${error.message}` },
      { status: 502 },
    );
  }
  const message = error instanceof Error ? error.message : 'Okänt fel';
  console.error('[jarvis] oväntat fel:', error);
  return Response.json({ error: 'oväntat', message }, { status: 500 });
}
