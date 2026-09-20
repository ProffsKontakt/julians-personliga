'use client';

import { App, Page, Button } from 'konsta/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { IconCheck, IconSparkle, IconWarning } from '@/components/icons';
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
        setError(resetError.message);
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
      <Page className="!bg-transparent">
        <div className="flex min-h-full items-center justify-center p-5">
          <div className="w-full max-w-sm">
            <h1 className="mb-1 text-center text-[34px] font-bold tracking-tight text-white">
              Jarvis
            </h1>
            <p className="mb-6 text-center text-[15px] text-white/45">Din hubb.</p>

            {state === 'reset-sent' ? (
              <GlassCard className="flex flex-col items-center gap-3 py-8 text-center">
                <IconCheck className="w-8 h-8 text-[#26c185]" />
                <h2 className="text-[17px] font-semibold text-white">Återställningslänk skickad</h2>
                <p className="max-w-[30ch] text-[14px] leading-relaxed text-white/55">
                  Kolla mejlen till {email}. Landar länken på fel adress är det Site URL i
                  Supabase som pekar fel.
                </p>
                <button
                  onClick={() => setState('idle')}
                  className="mt-1 text-[14px] font-medium text-[#0a84ff]"
                >
                  Tillbaka
                </button>
              </GlassCard>
            ) : (
              <GlassCard>
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
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-[16px] text-white outline-none placeholder:text-white/30 focus:border-[#0a84ff]/60"
                  />
                  <input
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Lösenord"
                    aria-label="Lösenord"
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-[16px] text-white outline-none placeholder:text-white/30 focus:border-[#0a84ff]/60"
                  />
                  <Button large rounded type="submit" disabled={!canSubmit}>
                    <span className="flex items-center gap-2">
                      {state === 'sending' && <IconSparkle className="w-5 h-5 animate-pulse" />}
                      {state === 'sending' ? 'Loggar in…' : 'Logga in'}
                    </span>
                  </Button>
                </form>

                {error && (
                  <div className="hair-t mt-3 flex items-start gap-2 pt-3">
                    <IconWarning className="w-5 h-5 shrink-0 text-[#fa6a22]" />
                    <p className="text-[13px] leading-relaxed text-white/70">{error}</p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => void resetPassword()}
                  disabled={state === 'sending'}
                  className="mt-3 w-full text-center text-[13px] font-medium text-white/40 active:text-[#0a84ff]"
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
