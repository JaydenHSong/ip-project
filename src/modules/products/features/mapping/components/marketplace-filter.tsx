'use client';

// Design Ref: §4.2 Client Component for URL searchParams mutation
// Plan SC: SC-07 contract — filter by marketplace param

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { MARKETPLACES } from '@/modules/products/shared/constants';
import type { Marketplace } from '@/modules/products/shared/types';

type MarketplaceCounts = Partial<Record<Marketplace | 'all', number>>;

type Props = {
  current?: Marketplace;
  counts?: MarketplaceCounts;
};

const FLAG: Record<Marketplace, string> = {
  US: '🇺🇸', CA: '🇨🇦', MX: '🇲🇽',
  UK: '🇬🇧', DE: '🇩🇪', FR: '🇫🇷', IT: '🇮🇹', ES: '🇪🇸',
  JP: '🇯🇵', AU: '🇦🇺', SG: '🇸🇬',
};

export function MarketplaceFilter({ current, counts }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setMarketplace = useCallback(
    (value: Marketplace | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set('marketplace', value);
      } else {
        params.delete('marketplace');
      }
      params.delete('page'); // reset pagination
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, pathname, searchParams]
  );

  const isAll = !current;

  return (
    <div className="flex items-center gap-1 border-b border-[var(--border-primary)] text-sm overflow-x-auto">
      <button
        type="button"
        onClick={() => setMarketplace(null)}
        className={tabClass(isAll)}
        aria-pressed={isAll}
      >
        All
        {typeof counts?.all === 'number' && (
          <span className="text-xs text-[var(--text-tertiary)] ml-1">
            {counts.all.toLocaleString()}
          </span>
        )}
      </button>
      {MARKETPLACES.map((mp) => {
        const active = current === mp;
        return (
          <button
            key={mp}
            type="button"
            onClick={() => setMarketplace(mp)}
            className={tabClass(active)}
            aria-pressed={active}
          >
            <span className="mr-1">{FLAG[mp]}</span>
            {mp}
            {typeof counts?.[mp] === 'number' && (
              <span className="text-xs text-[var(--text-tertiary)] ml-1">
                {counts[mp]?.toLocaleString()}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function tabClass(active: boolean): string {
  const base = 'px-3 pb-2 whitespace-nowrap transition-colors';
  if (active) {
    return `${base} border-b-2 font-medium`
      + ' border-[var(--accent)] text-[var(--text-primary)]';
  }
  return `${base} text-[var(--text-tertiary)] hover:text-[var(--text-primary)]`;
}
