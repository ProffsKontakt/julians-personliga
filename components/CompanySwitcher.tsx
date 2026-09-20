'use client';

import { Button, Sheet } from 'konsta/react';
import { useState } from 'react';
import { IconPlus } from './icons';
import { useStore } from '@/lib/store';
import type { Company } from '@/lib/types';
import { uid } from '@/lib/utils';

/**
 * Bolagsväxlaren.
 *
 * En rad piller, ett per bolag, det aktiva i accent. Samma formspråk som
 * flikarna, men medvetet inte samma komponent: flikar byter vy inom en
 * skärm, det här byter vilket bolag hela dashboarden handlar om. Det ska
 * kännas som ett större val.
 */
export function CompanySwitcher() {
  const { state, activeCompany, setActiveCompany, saveCompany } = useStore();
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5">
        {state.companies.map((c) => {
          const active = c.id === activeCompany?.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveCompany(c.id)}
              aria-pressed={active}
              className="rounded-full border px-3 py-1.5 text-[13px] font-medium transition-all duration-200"
              style={
                active
                  ? {
                      color: 'var(--accent)',
                      borderColor: 'rgb(var(--accent-rgb) / 0.45)',
                      background: 'rgb(var(--accent-rgb) / 0.12)',
                      boxShadow: '0 0 18px -6px rgb(var(--accent-rgb) / 0.6)',
                    }
                  : {
                      color: 'var(--ink-2)',
                      borderColor: 'var(--hair)',
                      background: 'rgb(255 255 255 / 0.03)',
                    }
              }
            >
              <span className="mr-1.5 font-semibold tracking-[0.08em] uppercase opacity-70">
                {kortnamn(c)}
              </span>
              {c.namn}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Nytt bolag"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--hair)] text-[var(--ink-2)] transition-colors hover:text-[var(--accent)]"
        >
          <IconPlus className="w-4 h-4" />
        </button>
      </div>

      <CompanyForm
        opened={open}
        onClose={() => setOpen(false)}
        onSave={(c) => {
          void saveCompany(c);
          setOpen(false);
        }}
      />
    </>
  );
}

/** Kortnamnet, eller initialerna om inget satts: "Optimera Energi" → "OE". */
export function kortnamn(c: Company): string {
  if (c.kortnamn) return c.kortnamn;
  return c.namn
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((ord) => ord[0]!.toUpperCase())
    .join('');
}

function CompanyForm({
  opened,
  onClose,
  onSave,
}: {
  opened: boolean;
  onClose: () => void;
  onSave: (c: Company) => void;
}) {
  const [namn, setNamn] = useState('');
  const [kort, setKort] = useState('');
  const [orgnr, setOrgnr] = useState('');

  const giltig = namn.trim().length > 0;

  function spara() {
    onSave({
      id: uid('b'),
      namn: namn.trim(),
      kortnamn: kort.trim() || undefined,
      orgnr: orgnr.trim() || undefined,
      aktiv: true,
      createdAt: new Date().toISOString(),
    });
    setNamn('');
    setKort('');
    setOrgnr('');
  }

  return (
    <Sheet opened={opened} onBackdropClick={onClose} className="max-h-[80vh] overflow-auto pb-safe">
      <div className="p-4">
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-white/25" />
        <h2 className="text-[20px] font-semibold text-white">Nytt bolag</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-[var(--ink-2)]">
          Varje bolag får sin egen dashboard: egna affärer, egna fasta kostnader, eget resultat.
        </p>

        <div className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="micro">Namn</span>
            <input
              value={namn}
              onChange={(e) => setNamn(e.target.value)}
              placeholder="Bolagsnamn"
              className="field px-3.5 py-2.5 text-[16px]"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="micro">Kortnamn</span>
              <input
                value={kort}
                onChange={(e) => setKort(e.target.value)}
                placeholder="valfritt"
                maxLength={4}
                className="field px-3.5 py-2.5 text-[16px] uppercase"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="micro">Org.nr</span>
              <input
                value={orgnr}
                onChange={(e) => setOrgnr(e.target.value)}
                placeholder="valfritt"
                inputMode="numeric"
                className="field px-3.5 py-2.5 text-[16px]"
              />
            </label>
          </div>
        </div>

        <div className="sheet-footer sticky bottom-0 -mx-4 mt-5 flex gap-2 border-t-[0.5px] border-[var(--hair)] px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button rounded outline onClick={onClose} className="flex-1">
            Avbryt
          </Button>
          <Button rounded onClick={spara} disabled={!giltig} className="btn-tron flex-[2]">
            Skapa
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
