'use client';

import { App, Page, Button } from 'konsta/react';
import { useSearchParams } from 'next/navigation';
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

function LoginInner() {
  const params = useSearchParams();
  const next = params.get('next') ?? '/';
  const initialError =
    params.get('fel') === 'utgangen'
      ? 'Länken har gått ut eller redan använts. Begär en ny.'
      : params.get('fel') === 'ingen_kod'
        ? 'Länken saknade inloggningskod. Begär en ny.'
        : null;

  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(initialError);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setState('sending');
    setError(null);

    try {
      const supabase = supabaseBrowser();
      const redirect = new URL('/auth/callback', window.location.origin);
      redirect.searchParams.set('next', next);

      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: redirect.toString() },
      });

      if (authError) {
        setError(authError.message);
        setState('idle');
        return;
      }
      setState('sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Något gick fel.');
      setState('idle');
    }
  }

  return (
    <App theme="ios" dark safeAreas>
      <Page className="!bg-transparent">
        <div className="flex min-h-full items-center justify-center p-5">
          <div className="w-full max-w-sm">
            <h1 className="mb-1 text-center text-[34px] font-bold tracking-tight text-white">
              Jarvis
            </h1>
            <p className="mb-6 text-center text-[15px] text-white/45">
              Din hubb. Logga in med din mejladress.
            </p>

            {state === 'sent' ? (
              <GlassCard className="flex flex-col items-center gap-3 py-8 text-center">
                <IconCheck className="w-8 h-8 text-[#26c185]" />
                <h2 className="text-[17px] font-semibold text-white">Länk skickad</h2>
                <p className="max-w-[30ch] text-[14px] leading-relaxed text-white/55">
                  Öppna mejlet till {email} och klicka på länken. Den fungerar en gång och går ut
                  efter en stund.
                </p>
                <button
                  onClick={() => setState('idle')}
                  className="mt-1 text-[14px] font-medium text-[#0a84ff]"
                >
                  Skicka igen
                </button>
              </GlassCard>
            ) : (
              <GlassCard>
                <form onSubmit={send} className="flex flex-col gap-3">
                  <input
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="din@mejl.se"
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-[16px] text-white outline-none placeholder:text-white/30 focus:border-[#0a84ff]/60"
                  />
                  <Button
                    large
                    rounded
                    type="submit"
                    disabled={state === 'sending' || !email.trim()}
                  >
                    <span className="flex items-center gap-2">
                      {state === 'sending' && <IconSparkle className="w-5 h-5 animate-pulse" />}
                      {state === 'sending' ? 'Skickar…' : 'Skicka inloggningslänk'}
                    </span>
                  </Button>
                </form>

                {error && (
                  <div className="mt-3 flex items-start gap-2 hair-t pt-3">
                    <IconWarning className="w-5 h-5 shrink-0 text-[#fa6a22]" />
                    <p className="text-[13px] leading-relaxed text-white/70">{error}</p>
                  </div>
                )}
              </GlassCard>
            )}

            <p className="mt-5 px-2 text-center text-[12px] leading-relaxed text-white/30">
              Inget lösenord att komma ihåg eller läcka. Du får en engångslänk per mejl, och
              sessionen ligger kvar på enheten efteråt.
            </p>
          </div>
        </div>
      </Page>
    </App>
  );
}
