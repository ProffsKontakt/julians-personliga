'use client';

import { App, Page, Button } from 'konsta/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { IconCheck, IconSparkle, IconWarning } from '@/components/icons';
import { Monogram } from '@/components/Shell';
import { GlassCard } from '@/components/ui';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

/**
 * Inloggning med mejl och lösenord.
 *
 * Tidigare låg här en engångslänk per mejl. Den kräver att Supabases Site URL
 * och redirect-URL:er är rätt satta, och landar annars på localhost — vilket
 * är precis vad som hände. Lösenord har inget sådant beroende: inget mejl
 * skickas, ingen omdirigering sker, och inloggningen fungerar direkt.
 */
function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'reset-sent'>('idle');
  const [error, setError] = useState<string | null>(
    params.get('fel') === 'utgangen'
      ? 'Återställningslänken har gått ut eller redan använts.'
      : null,
  );

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setState('sending');
    setError(null);

    try {
      const { error: authError } = await supabaseBrowser().auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        // Supabase svarar "Invalid login credentials" oavsett om det är mejlet
        // eller lösenordet som är fel. Det är avsiktligt — annars går det att
        // ta reda på vilka konton som finns. Vi behåller den otydligheten.
        setError(
          authError.message === 'Invalid login credentials'
            ? 'Fel mejladress eller lösenord.'
            : authError.message,
        );
        setState('idle');
        return;
      }

      // Hård navigering, inte router.push: middleware måste läsa den nysatta
      // sessionskakan, och det sker först vid en riktig förfrågan.
      window.location.href = next.startsWith('/') && !next.startsWith('//') ? next : '/';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Något gick fel.');
      setState('idle');
    }
  }

  async function resetPassword() {
    if (!email.trim()) {
      setError('Fyll i din mejladress först, så skickar jag en återställningslänk.');
      return;
    }
    setState('sending');
    setError(null);
    try {
      const { error: resetError } = await supabaseBrowser().auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: `${window.location.origin}/auth/callback?next=/konto` },
      );
      if (resetError) {
        // Supabase tar emot ett fåtal återställningsmejl per timme och svarar
        // 429 därefter. Rått felmeddelande säger ingenting om att man bara
        // behöver vänta.
        setError(
          resetError.status === 429
            ? 'För många återställningsförsök. Supabase släpper bara igenom ett fåtal mejl per timme — vänta en stund och försök igen.'
            : resetError.message,
        );
        setState('idle');
        return;
      }
      setState('reset-sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Något gick fel.');
      setState('idle');
    }
  }

  const canSubmit = email.trim().length > 0 && password.length > 0 && state !== 'sending';

  return (
    <App theme="ios" dark safeAreas>
      <div className="ambient" aria-hidden="true" />
      {/* Rutnätsgolvet och horisonten finns bara här: i appen hade de
          tävlat med data, på inloggningen finns ingen. */}
      <div className="grid-floor" aria-hidden="true" />
      <div className="grid-horizon" aria-hidden="true" />
      <Page className="!bg-transparent">
        {/* Lyft mot horisonten: innehållet centreras i ytan ovanför golvet. */}
        <div className="flex min-h-full items-center justify-center p-5 pb-[20vh]">
          <div className="w-full max-w-sm">
            <div className="mb-7 flex flex-col items-center gap-4">
              <Monogram className="w-16 h-16 drop-shadow-[0_0_18px_rgb(var(--accent-rgb)/0.55)]" />
              <div className="flex flex-col items-center gap-1.5">
                <h1
                  className="text-[30px] font-semibold tracking-[0.32em] text-white"
                  style={{ paddingLeft: '0.32em' }}
                >
                  JARVIS
                </h1>
                <span className="micro">Identifiera dig</span>
              </div>
            </div>

            {state === 'reset-sent' ? (
              <GlassCard accent className="flex flex-col items-center gap-3 py-8 text-center">
                <IconCheck className="w-8 h-8 text-[var(--accent)]" />
                <h2 className="text-[17px] font-semibold text-white">Återställningslänk skickad</h2>
                <p className="max-w-[30ch] text-[14px] leading-relaxed text-white/55">
                  Kolla mejlen till {email}. Landar länken på fel adress är det Site URL i Supabase
                  som pekar fel.
                </p>
                <button
                  onClick={() => setState('idle')}
                  className="mt-1 text-[14px] font-medium text-[var(--accent)]"
                >
                  Tillbaka
                </button>
              </GlassCard>
            ) : (
              <GlassCard accent>
                <form onSubmit={login} className="flex flex-col gap-3">
                  <input
                    type="email"
                    autoComplete="username"
                    inputMode="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Mejladress"
                    aria-label="Mejladress"
                    className="field px-4 py-3 text-[16px]"
                  />
                  <input
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Lösenord"
                    aria-label="Lösenord"
                    className="field px-4 py-3 text-[16px]"
                  />
                  <Button large rounded type="submit" disabled={!canSubmit} className="btn-tron">
                    <span className="flex items-center gap-2">
                      {state === 'sending' && <IconSparkle className="w-5 h-5 animate-pulse" />}
                      {state === 'sending' ? 'Loggar in…' : 'Logga in'}
                    </span>
                  </Button>
                </form>

                {error && (
                  <div className="hair-t mt-3 flex items-start gap-2 pt-3">
                    <IconWarning className="w-5 h-5 shrink-0 text-[#ff6b4a]" />
                    <p className="text-[13px] leading-relaxed text-white/70">{error}</p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => void resetPassword()}
                  disabled={state === 'sending'}
                  className="mt-3 w-full text-center text-[13px] font-medium text-white/40 active:text-[var(--accent)]"
                >
                  Glömt lösenordet?
                </button>
              </GlassCard>
            )}
          </div>
        </div>
      </Page>
    </App>
  );
}
