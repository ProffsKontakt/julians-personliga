'use client';

import { App, Page, Navbar, Tabbar, TabbarLink } from 'konsta/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { IconBriefcase, IconChart, IconDumbbell, IconHome, IconReceipt } from './icons';

/**
 * Navigationen.
 *
 * `tron` avgör skärmens accentfärg. I filmen äger varje rutnät exakt en färg
 * — Flynns blå, Dillingers röda — och det är den regeln som gör bilderna
 * läsbara trots att nästan allt är svart. Här betyder cyan det som byggs upp
 * och rött det som förbrukas.
 */
const TABS = [
  { href: '/', label: 'Hem', Icon: IconHome, tron: 'bla' },
  { href: '/foretag', label: 'Företag', Icon: IconBriefcase, tron: 'bla' },
  { href: '/kapital', label: 'Kapital', Icon: IconChart, tron: 'bla' },
  { href: '/kvitton', label: 'Kvitton', Icon: IconReceipt, tron: 'rod' },
  { href: '/kraft', label: 'Kraft', Icon: IconDumbbell, tron: 'rod' },
] as const;

export type TronAccent = 'bla' | 'rod';

interface ShellProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  /** Överstyr accentfärgen. Utan den härleds den ur rutten. */
  tron?: TronAccent;
  children: ReactNode;
}

function isActive(href: string, pathname: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

export default function Shell({ title, subtitle, right, tron, children }: ShellProps) {
  const pathname = usePathname();
  const accent = tron ?? TABS.find((t) => isActive(t.href, pathname))?.tron ?? 'bla';

  return (
    /*
     * Sidoraden ligger som flex-syskon UTANFÖR <App>. Konstas App är
     * `relative` och dess Page `absolute inset-0` — en sidorad inuti hade
     * antingen legat under sidan eller tvingat Page ur sitt eget koordinat-
     * system. Som syskon får Page i stället hela flex-barnet som ram, och
     * Konsta behöver inte röras alls.
     */
    <div data-tron={accent} className="flex h-full w-full">
      {/* Ambient ligger inuti det tema-satta trädet så den ärver accenten.
          Den är `fixed` och täcker ändå hela vyn — wrappern skapar ingen
          stacking context som kunde fånga in den. */}
      <div className="ambient" aria-hidden="true" />

      <Rail pathname={pathname} />

      <div className="relative min-w-0 flex-1">
        <App theme="ios" dark safeAreas>
          <Page className="!bg-transparent">
            {/* Telefon: Konstas stora iOS-navbar. */}
            <div className="lg:hidden">
              <Navbar
                large
                transparent
                title={title}
                subtitle={subtitle}
                right={right}
                className="!bg-transparent"
                bgClassName="chrome"
                titleClassName="text-white"
                subtitleClassName="text-[var(--ink-2)]"
              />
              {/* Konsta döljer underrubriken i large-läge (titelraden sätts
                  till opacity-0). Den får därför en egen rad här. */}
              {subtitle && (
                <p className="-mt-2 px-5 pb-1 text-[14px] text-[var(--ink-2)]">{subtitle}</p>
              )}
            </div>

            {/* Desktop: egen rubrikrad. En 34px-titel längst ut till vänster
                medan innehållet ligger centrerat hade läst som ett fel. */}
            <header className="hidden lg:block">
              <div className="mx-auto flex w-full max-w-[1180px] items-start justify-between px-8 pt-10 pb-2">
                <div>
                  <h1 className="text-[28px] font-semibold tracking-tight text-white">{title}</h1>
                  {subtitle && <p className="mt-0.5 text-[14px] text-[var(--ink-2)]">{subtitle}</p>}
                </div>
                {right}
              </div>
            </header>

            <div className="page-pad">
              <div className="mx-auto w-full max-w-[1180px] lg:px-8">{children}</div>
            </div>

            <Tabbar
              labels
              icons
              className="fixed bottom-0 left-0 z-40 lg:hidden"
              /* Ingen colors-override här: Konstas bgIos sätts med `!` och
                 skulle slå ut .chrome, så innehållet lyste rakt igenom. */
              bgClassName="chrome border-t-[0.5px] border-[var(--hair)]"
            >
              {TABS.map(({ href, label, Icon }) => {
                const active = isActive(href, pathname);
                return (
                  <TabbarLink
                    key={href}
                    active={active}
                    component={Link}
                    linkProps={{ href }}
                    icon={
                      <Icon
                        className="w-6 h-6"
                        style={active ? { color: 'var(--accent)' } : undefined}
                      />
                    }
                    label={label}
                  />
                );
              })}
            </Tabbar>
          </Page>
        </App>
      </div>
    </div>
  );
}

/**
 * Sidoraden på desktop. Ersätter tabbaren — en flytande tabbrad mitt i en
 * 1600 px bred skärm ser ut som en telefon som glömts kvar.
 */
function Rail({ pathname }: { pathname: string }) {
  return (
    <aside className="relative z-40 hidden w-[92px] shrink-0 flex-col items-center border-r-[0.5px] border-[var(--hair)] py-7 lg:flex">
      <Link href="/" className="mb-8 block" aria-label="Hem">
        <Monogram />
      </Link>

      <nav className="flex w-full flex-col items-center gap-1">
        {TABS.map(({ href, label, Icon, tron }) => {
          const active = isActive(href, pathname);
          return (
            <Link
              key={href}
              href={href}
              data-tron={tron}
              aria-current={active ? 'page' : undefined}
              className="group relative flex w-full flex-col items-center gap-1.5 py-3 transition-opacity duration-200"
              style={{ opacity: active ? 1 : 0.45 }}
            >
              {/* Aktiv rad markeras med ett ljusstreck på kanten, inte med en
                  ifylld platta. Ljus sitter på kanter i den här världen. */}
              {active && (
                <span
                  aria-hidden
                  className="absolute left-0 top-1/2 h-8 w-[2px] -translate-y-1/2 rounded-r"
                  style={{
                    background: 'var(--accent)',
                    boxShadow: '0 0 12px 0 rgb(var(--accent-rgb) / 0.8)',
                  }}
                />
              )}
              <Icon
                className="w-[22px] h-[22px]"
                style={active ? { color: 'var(--accent)' } : { color: 'white' }}
              />
              <span
                className="text-[10px] font-semibold tracking-[0.1em] uppercase"
                style={{ color: active ? 'var(--accent)' : 'var(--ink-2)' }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      <Link
        href="/konto"
        className="mt-auto flex flex-col items-center gap-1.5 py-3 opacity-45 transition-opacity hover:opacity-100"
        aria-label="Konto"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--hair)] text-[12px] font-semibold text-white">
          J
        </span>
      </Link>
    </aside>
  );
}

/** Hexagon — motivet går igenom hela filmen. */
function Monogram() {
  return (
    <svg viewBox="0 0 32 34" className="w-9 h-9" aria-hidden>
      <path
        d="M16 1.5 30 9.5v16L16 33.5 2 25.5v-16L16 1.5Z"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1.25"
        opacity="0.55"
      />
      <path
        d="M16 7 25 12.2v10.6L16 28l-9-5.2V12.2L16 7Z"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1.25"
      />
      <circle cx="16" cy="17.5" r="2.4" fill="var(--accent)" />
    </svg>
  );
}
