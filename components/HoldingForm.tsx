'use client';

import { Button, List, ListInput, Sheet } from 'konsta/react';
import { useState } from 'react';
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
};

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
        }
      : EMPTY,
  );

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
