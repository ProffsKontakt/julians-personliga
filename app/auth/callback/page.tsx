'use client';

import { App, Page } from 'konsta/react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { IconSparkle, IconWarning } from '@/components/icons';
import { GlassCard } from '@/components/ui';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function CallbackPage() {
  return (
    <Suspense fallback={null}>
      <CallbackInner />
    </Suspense>
  );
}

/**
 * Landningspunkt för återställningslänken i mejlet.
 *
 * Detta var tidigare en serverrutt som bara läste ?code=. Det räcker inte:
 * Supabase skickar tillbaka sessionen på två olika sätt beroende på flöde.
 *
 *   PKCE     → ?code=... i frågesträngen      (servern kan se den)
 *   Implicit → #access_token=... i hashen     (servern ser den ALDRIG —
 *              fragment skickas inte med i HTTP-förfrågan)
 *
 * En serverrutt hade svarat "ingen kod" på det andra fallet utan att något
 * var fel. Därför körs detta i webbläsaren, som ser båda.
 */
function CallbackInner() {
  const params = useSearchParams();
  const [fel, setFel] = useState<string | null>(null);
  const korde = useRef(false);

  useEffect(() => {
    // React kör effekter två gånger i utvecklingsläge. En engångskod går
    // bara att växla in en gång — andra försöket hade alltid misslyckats.
    if (korde.current) return;
    korde.current = true;

    const next = params.get('next') ?? '/';
    // Öppen omdirigering är en riktig sårbarhet: ?next=https://exempel.se
    // hade skickat användaren dit med sessionen nyss satt.
    const mal = next.startsWith('/') && !next.startsWith('//') ? next : '/';

    let stada: (() => void) | undefined;

    void (async () => {
      const db = supabaseBrowser();

      const felkod = params.get('error_description') ?? params.get('error');
      if (felkod) {
        setFel(felkod);
        return;
      }

      const code = params.get('code');
      if (code) {
        const { error } = await db.auth.exchangeCodeForSession(code);
        if (error) {
          setFel(
            error.message.toLowerCase().includes('code verifier')
              ? 'Länken öppnades i en annan webbläsare än den du begärde den från. Begär en ny och öppna den på samma enhet.'
              : 'Länken har gått ut eller redan använts. Begär en ny.',
          );
          return;
        }
        window.location.href = mal;
        return;
      }

      /*
       * Ingen kod i frågesträngen. Då ligger sessionen i hashen, och
       * supabase-js plockar upp den själv vid start (detectSessionInUrl).
       * Vi väntar in den i stället för att gissa.
       */
      const { data } = await db.auth.getSession();
      if (data.session) {
        window.location.href = mal;
        return;
      }

      const { data: lyssnare } = db.auth.onAuthStateChange((_event, session) => {
        if (session) window.location.href = mal;
      });

      const timeout = setTimeout(() => {
        lyssnare.subscription.unsubscribe();
        setFel('Länken innehöll ingen giltig inloggning. Begär en ny.');
      }, 6000);

      stada = () => {
        clearTimeout(timeout);
        lyssnare.subscription.unsubscribe();
      };
    })();

    return () => stada?.();
  }, [params]);

  return (
    <App theme="ios" dark safeAreas>
      <Page className="!bg-transparent">
        <div className="flex min-h-full items-center justify-center p-5">
          <div className="w-full max-w-sm">
            <h1 className="mb-6 text-center text-[28px] font-bold tracking-tight text-white">
              Jarvis
            </h1>
            <GlassCard className="flex flex-col items-center gap-3 py-8 text-center">
              {fel ? (
                <>
                  <IconWarning className="w-7 h-7 text-[#fa6a22]" />
                  <p className="max-w-[32ch] text-[14px] leading-relaxed text-white/70">{fel}</p>
                  <a href="/login" className="mt-1 text-[14px] font-medium text-[#0a84ff]">
                    Till inloggningen
                  </a>
                </>
              ) : (
                <>
                  <IconSparkle className="w-7 h-7 animate-pulse text-white/50" />
                  <p className="text-[14px] text-white/55">Loggar in dig…</p>
                </>
              )}
            </GlassCard>
          </div>
        </div>
      </Page>
    </App>
  );
}
