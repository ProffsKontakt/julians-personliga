'use client';

import { Block, Button } from 'konsta/react';
import { useState } from 'react';
import { IconCheck, IconWarning } from '@/components/icons';
import Shell from '@/components/Shell';
import { GlassCard, SectionTitle } from '@/components/ui';
import { useStore } from '@/lib/store';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function KontoPage() {
  const { user, signOut } = useStore();
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [state, setState] = useState<'idle' | 'sparar' | 'klart'>('idle');
  const [error, setError] = useState<string | null>(null);

  const mismatch = repeat.length > 0 && password !== repeat;
  const tooShort = password.length > 0 && password.length < 10;
  const canSave = password.length >= 10 && password === repeat && state !== 'sparar';

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setState('sparar');
    setError(null);

    const { error: updateError } = await supabaseBrowser().auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setState('idle');
      return;
    }
    setPassword('');
    setRepeat('');
    setState('klart');
    setTimeout(() => setState('idle'), 3000);
  }

  return (
    <Shell title="Konto" subtitle={user?.email ?? undefined}>
      <Block className="!mt-0 space-y-0">
        <SectionTitle>Lösenord</SectionTitle>
        <GlassCard>
          <form onSubmit={save} className="flex flex-col gap-3">
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nytt lösenord"
              aria-label="Nytt lösenord"
              className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-[16px] text-white outline-none placeholder:text-[var(--ink-3)] focus:border-[var(--accent)]/60"
            />
            <input
              type="password"
              autoComplete="new-password"
              value={repeat}
              onChange={(e) => setRepeat(e.target.value)}
              placeholder="Upprepa"
              aria-label="Upprepa lösenord"
              className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-[16px] text-white outline-none placeholder:text-[var(--ink-3)] focus:border-[var(--accent)]/60"
            />

            {tooShort && (
              <p className="text-[12px] text-[var(--ink-3)]">Minst 10 tecken.</p>
            )}
            {mismatch && (
              <p className="text-[12px] text-[#ff6b4a]">Lösenorden är inte lika.</p>
            )}

            <Button rounded type="submit" disabled={!canSave}>
              {state === 'sparar' ? 'Sparar…' : 'Byt lösenord'}
            </Button>
          </form>

          {state === 'klart' && (
            <div className="hair-t mt-3 flex items-center gap-2 pt-3">
              <IconCheck className="w-5 h-5 text-[var(--accent)]" />
              <p className="text-[13px] text-white/70">Lösenordet är bytt.</p>
            </div>
          )}
          {error && (
            <div className="hair-t mt-3 flex items-start gap-2 pt-3">
              <IconWarning className="w-5 h-5 shrink-0 text-[#ff6b4a]" />
              <p className="text-[13px] leading-relaxed text-white/70">{error}</p>
            </div>
          )}
        </GlassCard>

        <SectionTitle>Session</SectionTitle>
        <GlassCard>
          <p className="mb-3 text-[13px] leading-relaxed text-[var(--ink-3)]">
            Sessionen ligger kvar på den här enheten tills du loggar ut. Loggar du ut på telefonen
            påverkas inte datorn.
          </p>
          <Button rounded outline onClick={() => void signOut()}>
            Logga ut
          </Button>
        </GlassCard>
      </Block>
    </Shell>
  );
}
