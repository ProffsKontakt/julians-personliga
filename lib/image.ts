/**
 * Bildförbehandling i webbläsaren.
 *
 * Kvittofoton från en modern telefon är 3–6 MB. De behöver inte vara det:
 * modellen läser text, och 1600 px på längsta sidan räcker gott för att
 * upplösa kvittotext. Vi sparar bandbredd, latens och lagring i ett drag.
 */

export interface PreparedImage {
  blob: Blob;
  base64: string;
  mediaType: 'image/jpeg';
  width: number;
  height: number;
}

const MAX_EDGE = 1600;
const QUALITY = 0.82;

export async function prepareImage(file: File): Promise<PreparedImage> {
  const bitmap = await createImageBitmap(file);

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Kunde inte skapa canvas-kontext');

  // Vit bakgrund: kvitton är vita, och JPEG saknar alfakanal.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Kunde inte koda bilden'))),
      'image/jpeg',
      QUALITY,
    );
  });

  return {
    blob,
    base64: await blobToBase64(blob),
    mediaType: 'image/jpeg',
    width,
    height,
  };
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strippa "data:image/jpeg;base64," — API:t vill ha råa bytes.
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** Objekt-URL med automatisk städning via useEffect i anropande komponent. */
export function objectUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}
