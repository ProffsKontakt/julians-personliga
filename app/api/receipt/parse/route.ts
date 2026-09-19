import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { client, errorResponse, MODEL } from '@/lib/anthropic';
import { ParsedReceiptSchema, RECEIPT_SYSTEM_PROMPT } from '@/lib/receipt-schema';

export const runtime = 'nodejs';
/** Bildtolkning tar tid. Vercel Hobby tillåter 60 s; Pro mer. */
export const maxDuration = 60;

const ALLOWED_MEDIA = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
type AllowedMedia = (typeof ALLOWED_MEDIA)[number];

/** ~5 MB base64 ≈ 3,7 MB bild. Över det ska klienten ha komprimerat först. */
const MAX_BASE64_LENGTH = 5_000_000;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      imageBase64?: string;
      mediaType?: string;
    };

    const { imageBase64, mediaType } = body;

    if (!imageBase64) {
      return Response.json(
        { error: 'ingen_bild', message: 'Fältet imageBase64 saknas.' },
        { status: 400 },
      );
    }
    if (!ALLOWED_MEDIA.includes(mediaType as AllowedMedia)) {
      return Response.json(
        {
          error: 'fel_format',
          message: `mediaType måste vara en av ${ALLOWED_MEDIA.join(', ')}.`,
        },
        { status: 400 },
      );
    }
    if (imageBase64.length > MAX_BASE64_LENGTH) {
      return Response.json(
        {
          error: 'for_stor',
          message: 'Bilden är för stor. Komprimera den till under ~3 MB innan uppladdning.',
        },
        { status: 413 },
      );
    }

    const response = await client().messages.parse({
      model: MODEL,
      max_tokens: 16000,
      system: RECEIPT_SYSTEM_PROMPT,
      output_config: {
        effort: 'high',
        format: zodOutputFormat(ParsedReceiptSchema),
      },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType as AllowedMedia,
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: 'Läs kvittot och fyll i schemat. Ta med varje varurad, även de du är osäker på.',
            },
          ],
        },
      ],
    });

    if (response.stop_reason === 'refusal') {
      return Response.json(
        {
          error: 'avvisad',
          message: 'Modellen avböjde att tolka bilden. Prova ett annat foto.',
        },
        { status: 422 },
      );
    }

    if (!response.parsed_output) {
      return Response.json(
        {
          error: 'tolkning_misslyckades',
          message:
            response.stop_reason === 'max_tokens'
              ? 'Kvittot var för långt för ett svar. Fota det i två delar.'
              : 'Modellen kunde inte producera ett giltigt svar. Prova en skarpare bild.',
        },
        { status: 422 },
      );
    }

    return Response.json({
      receipt: response.parsed_output,
      usage: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
