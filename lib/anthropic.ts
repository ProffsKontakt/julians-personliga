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

  /*
   * Nycklar skapade på organisationsnivå tillhör ingen workspace. Anthropic
   * avvisar då varje anrop med 400 och ber om huvudet anthropic-workspace-id.
   * Är ANTHROPIC_WORKSPACE_ID satt skickar vi det, så att en organisationsnyckel
   * fungerar utan att behöva bytas ut. En workspace-scopad nyckel behöver inget
   * av detta — då lämnas variabeln tom och huvudet skickas aldrig.
   */
  const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID?.trim();

  return new Anthropic(
    workspaceId ? { defaultHeaders: { 'anthropic-workspace-id': workspaceId } } : undefined,
  );
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
  // Den vanligaste snubbeltråden vid uppsättning: en nyckel som saknar workspace.
  // Generiska "400 invalid_request_error" säger ingenting; det här gör det.
  if (error instanceof Anthropic.APIError && /anthropic-workspace-id/.test(error.message)) {
    return Response.json(
      {
        error: 'saknar_workspace',
        message:
          'Din ANTHROPIC_API_KEY är skapad på organisationsnivå och tillhör ingen workspace. Antingen: skapa en nyckel som är kopplad till en workspace i Anthropic Console, eller lägg till ANTHROPIC_WORKSPACE_ID i Vercels environment variables och deploya om.',
      },
      { status: 503 },
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
