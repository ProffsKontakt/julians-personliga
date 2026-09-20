'use client';

import { Button, List, ListInput, Sheet } from 'konsta/react';
import { useEffect, useRef, useState } from 'react';
import { IconCheck, IconSparkle, IconWarning } from '@/components/icons';
import {
  ACCOUNT_TYPES,
  HOLDING_KINDS,
  type AccountType,
  type Currency,
  type Holding,
  type HoldingKind,
} from '@/lib/types';
import { uid } from '@/lib/utils';

const CURRENCIES: Currency[] = ['SEK', 'USD', 'EUR', 'NOK', 'DKK'];

const EMPTY = {
  name: '',
  ticker: '',
  kind: 'aktie' as HoldingKind,
  quantity: '',
  avgCost: '',
  lastPrice: '',
  currency: 'SEK' as Currency,
  account: 'ISK' as AccountType,
  tags: '',
  borsapiId: '' as string,
  borsapiNamn: '' as string,
};

interface Traff {
  id: string;
  name: string;
  ticker: string | null;
  isin: string | null;
  sector: string | null;
  is_active: boolean;
}

export default function HoldingForm({
  opened,
  onClose,
  onSave,
  initial,
}: {
  opened: boolean;
  onClose: () => void;
  onSave: (holding: Holding) => void;
  initial?: Holding;
}) {
  const [form, setForm] = useState(() =>
    initial
      ? {
          name: initial.name,
          ticker: initial.ticker ?? '',
          kind: initial.kind,
          quantity: String(initial.quantity),
          avgCost: String(initial.avgCost),
          lastPrice: initial.lastPrice ? String(initial.lastPrice) : '',
          currency: initial.currency,
          account: initial.account,
          tags: initial.tags.join(', '),
          borsapiId: initial.borsapiId ?? '',
          borsapiNamn: initial.borsapiNamn ?? '',
        }
      : EMPTY,
  );

  const [fraga, setFraga] = useState('');
  const [traffar, setTraffar] = useState<Traff[] | null>(null);
  const [soker, setSoker] = useState(false);
  const [sokFel, setSokFel] = useState<string | null>(null);
  const avbryt = useRef<AbortController | null>(null);

  // Sökningen kostar API-kvot, så den går inte per tangenttryck.
  // 500 ms tystnad och minst två tecken innan något skickas.
  useEffect(() => {
    const q = fraga.trim();
    if (q.length < 2) {
      setTraffar(null);
      setSokFel(null);
      return;
    }
    const timer = setTimeout(async () => {
      avbryt.current?.abort();
      const controller = new AbortController();
      avbryt.current = controller;
      setSoker(true);
      setSokFel(null);
      try {
        const res = await fetch(`/api/borsdata/bolag?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        const payload = await res.json();
        if (!res.ok) {
          setSokFel(payload.message ?? 'Sökningen misslyckades.');
          setTraffar([]);
          return;
        }
        setTraffar(payload.bolag as Traff[]);
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') return;
        setSokFel('Kunde inte nå BörsAPI.');
        setTraffar([]);
      } finally {
        setSoker(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [fraga]);

  function valjBolag(t: Traff) {
    setForm((f) => ({
      ...f,
      name: t.name,
      ticker: t.ticker ?? f.ticker,
      borsapiId: t.id,
      borsapiNamn: t.name,
      tags: [...new Set([...f.tags.split(',').map((x) => x.trim()).filter(Boolean),
        ...(t.sector ? [t.sector] : [])])].join(', '),
    }));
    setFraga('');
    setTraffar(null);
  }

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const quantity = parseFloat(form.quantity.replace(',', '.'));
  const avgCost = parseFloat(form.avgCost.replace(',', '.'));
  const lastPrice = form.lastPrice ? parseFloat(form.lastPrice.replace(',', '.')) : undefined;
  const valid = form.name.trim().length > 0 && quantity > 0 && avgCost >= 0;

  function submit() {
    if (!valid) return;
    onSave({
      id: initial?.id ?? uid('h'),
      kind: form.kind,
      name: form.name.trim(),
      ticker: form.ticker.trim() || undefined,
      quantity,
      avgCost,
      lastPrice: lastPrice && lastPrice > 0 ? lastPrice : undefined,
      lastPriceAt: lastPrice && lastPrice > 0 ? new Date().toISOString() : undefined,
      currency: form.currency,
      account: form.account,
      tags: form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      createdAt: initial?.createdAt ?? new Date().toISOString(),
      borsapiId: form.borsapiId || undefined,
      borsapiNamn: form.borsapiNamn || undefined,
    });
    setForm(EMPTY);
    onClose();
  }

  return (
    <Sheet opened={opened} onBackdropClick={onClose} className="max-h-[90vh] overflow-auto">
      <div className="p-4">
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-white/25" />
        <h2 className="px-1 text-[20px] font-semibold text-white">
          {initial ? 'Ändra innehav' : 'Nytt innehav'}
        </h2>

        <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.05] p-3">
          <label className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.06em] text-white/45">
            Slå upp bolag
          </label>
          <input
            value={fraga}
            onChange={(e) => setFraga(e.target.value)}
            placeholder="Investor, VOLV-B, SE0015811963…"
            className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-[16px] text-white outline-none placeholder:text-white/30 focus:border-[#0a84ff]/60"
          />

          {form.borsapiId && (
            <p className="mt-2 flex items-center gap-1.5 text-[12px] text-[#26c185]">
              <IconCheck className="w-4 h-4" />
              Kopplat till {form.borsapiNamn}
            </p>
          )}
          {soker && (
            <p className="mt-2 flex items-center gap-1.5 text-[12px] text-white/40">
              <IconSparkle className="w-4 h-4 animate-pulse" /> Söker…
            </p>
          )}
          {sokFel && (
            <p className="mt-2 flex items-start gap-1.5 text-[12px] leading-relaxed text-white/60">
              <IconWarning className="w-4 h-4 shrink-0 text-[#fa6a22]" />
              {sokFel}
            </p>
          )}
          {traffar !== null && traffar.length === 0 && !soker && !sokFel && (
            <p className="mt-2 text-[12px] text-white/40">
              Ingen träff. Fonder och utländska aktier finns inte hos BörsAPI — fyll i namnet
              för hand så fungerar allt utom bolagsbevakningen.
            </p>
          )}
          {traffar && traffar.length > 0 && (
            <ul className="mt-2 divide-y divide-white/[0.06] overflow-hidden rounded-xl bg-white/[0.04]">
              {traffar.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => valjBolag(t)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left active:bg-white/[0.06]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] text-white">{t.name}</span>
                      <span className="block truncate text-[11px] text-white/40">
                        {[t.ticker, t.sector, t.is_active ? null : 'avnoterad']
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <List strongIos insetIos className="!mt-3">
          <ListInput
            label="Namn"
            type="text"
            placeholder="Investor B"
            value={form.name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('name', e.target.value)}
          />
          <ListInput
            label="Ticker (valfritt)"
            type="text"
            placeholder="INVE-B.ST"
            value={form.ticker}
            info="Används för automatisk kurshämtning när FINNHUB_API_KEY finns."
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('ticker', e.target.value)}
          />
          <ListInput
            label="Typ"
            type="select"
            dropdown
            value={form.kind}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              set('kind', e.target.value as HoldingKind)
            }
          >
            {HOLDING_KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </ListInput>
          <ListInput
            label="Antal"
            type="text"
            inputMode="decimal"
            placeholder="120"
            value={form.quantity}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('quantity', e.target.value)}
          />
          <ListInput
            label="GAV per andel"
            type="text"
            inputMode="decimal"
            placeholder="248,50"
            value={form.avgCost}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('avgCost', e.target.value)}
          />
          <ListInput
            label="Senaste kurs (valfritt)"
            type="text"
            inputMode="decimal"
            placeholder="271,00"
            value={form.lastPrice}
            info="Lämnas den tom värderas innehavet till anskaffningsvärde — och appen säger det."
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('lastPrice', e.target.value)}
          />
          <ListInput
            label="Valuta"
            type="select"
            dropdown
            value={form.currency}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              set('currency', e.target.value as Currency)
            }
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </ListInput>
          <ListInput
            label="Konto"
            type="select"
            dropdown
            value={form.account}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              set('account', e.target.value as AccountType)
            }
          >
            {ACCOUNT_TYPES.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </ListInput>
          <ListInput
            label="Teman"
            type="text"
            placeholder="halvledare, USA, utdelning"
            value={form.tags}
            info="Kommaseparerat. Driver exponeringsvyn och marknadsbriefingen."
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('tags', e.target.value)}
          />
        </List>

        <div className="flex gap-2 px-1 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button rounded outline onClick={onClose} className="flex-1">
            Avbryt
          </Button>
          <Button rounded onClick={submit} disabled={!valid} className="flex-[2]">
            Spara
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
