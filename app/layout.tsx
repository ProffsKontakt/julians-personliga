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
};

export const viewport: Viewport = {
  themeColor: '#000000',
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
        <div className="ambient" aria-hidden="true" />
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
