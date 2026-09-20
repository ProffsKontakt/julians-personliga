import type { Metadata, Viewport } from 'next';
import { StoreProvider } from '@/lib/store';
import './globals.css';

export const metadata: Metadata = {
  title: 'Jarvis',
  description: 'Personlig hubb — kvitton, kapital och kraft på ett ställe.',
  appleWebApp: {
    capable: true,
    title: 'Jarvis',
    statusBarStyle: 'black-translucent',
  },
  manifest: '/manifest.webmanifest',
  /*
   * Utan deklarerade ikoner gissar webbläsaren på /favicon.ico och får 404.
   * SVG för skarpa flikar på skrivbordet, PNG för iOS — apple-touch-icon
   * stödjer inte SVG, så utan PNG:en blir hemskärmsikonen en tom ruta.
   */
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#07090c',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Konsta omdefinierar dark-varianten till `&:where(.dark, .dark *)`.
    // Utan klassen här hamnar hela appen i ljust läge oavsett systemtema.
    <html lang="sv" className="dark">
      <body>
        {/* Ambienten renderas av <Shell> (och av inloggningssidan), inte här:
            den måste ligga inuti det data-tron-satta trädet för att kunna
            ärva skärmens accentfärg. */}
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
