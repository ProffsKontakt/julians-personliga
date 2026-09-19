'use client';

import { App, Page, Navbar, Tabbar, TabbarLink } from 'konsta/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { IconChart, IconDumbbell, IconHome, IconReceipt } from './icons';

const TABS = [
  { href: '/', label: 'Hem', Icon: IconHome },
  { href: '/kvitton', label: 'Kvitton', Icon: IconReceipt },
  { href: '/kapital', label: 'Kapital', Icon: IconChart },
  { href: '/kraft', label: 'Kraft', Icon: IconDumbbell },
] as const;

interface ShellProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
}

/**
 * Appskalet. Konsta äger navigationslagret — det är där Liquid Glass hör hemma
 * enligt Apples egna riktlinjer. Innehållslagret nedan använder glas sparsamt
 * och aldrig ovanpå ett annat glas.
 */
export default function Shell({ title, subtitle, right, children }: ShellProps) {
  const pathname = usePathname();

  return (
    <App theme="ios" dark safeAreas>
      <Page className="!bg-transparent">
        <Navbar
          large
          transparent
          title={title}
          subtitle={subtitle}
          right={right}
          className="!bg-transparent"
          bgClassName="!bg-black/60 backdrop-blur-2xl backdrop-saturate-150"
          titleClassName="text-white"
          subtitleClassName="text-white/55"
        />

        <div className="page-pad">{children}</div>

        <Tabbar
          labels
          icons
          className="fixed bottom-0 left-0 z-40"
          colors={{ bgIos: '!bg-black/55' }}
          bgClassName="backdrop-blur-2xl backdrop-saturate-[180%] border-t-[0.5px] border-white/10"
        >
          {TABS.map(({ href, label, Icon }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <TabbarLink
                key={href}
                active={active}
                component={Link}
                linkProps={{ href }}
                icon={<Icon className={active ? 'w-6 h-6' : 'w-6 h-6 opacity-65'} />}
                label={label}
              />
            );
          })}
        </Tabbar>
      </Page>
    </App>
  );
}
