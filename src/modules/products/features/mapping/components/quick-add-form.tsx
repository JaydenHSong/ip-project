'use client';

// Quick Add — core form fields (split from quick-add-modal.tsx for NFR-06)

import {
  MARKETPLACE_LABELS,
  MARKETPLACES,
} from '@/modules/products/shared/constants';
import type { Marketplace } from '@/modules/products/shared/types';

type Props = {
  sku: string;
  setSku: (v: string) => void;
  version: string;
  setVersion: (v: string) => void;
  asin: string;
  setAsin: (v: string) => void;
  marketplace: Marketplace;
  setMarketplace: (v: Marketplace) => void;
  isPrimary: boolean;
  setIsPrimary: (v: boolean) => void;
};

const inputCls =
  'mt-1 w-full rounded-lg border border-[var(--border-primary)] bg-[var(--surface-card)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]';

export function QuickAddForm({
  sku,
  setSku,
  version,
  setVersion,
  asin,
  setAsin,
  marketplace,
  setMarketplace,
  isPrimary,
  setIsPrimary,
}: Props) {
  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Label required>자재 (SKU)</Label>
          <input
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="ACS09879"
            className={inputCls}
          />
        </div>
        <div>
          <Label>배치</Label>
          <select value={version} onChange={(e) => setVersion(e.target.value)} className={inputCls}>
            <option value="V0">V0</option>
            <option value="V1">V1 (현재)</option>
            <option value="V2">V2</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label required>ASIN</Label>
          <input
            value={asin}
            onChange={(e) => setAsin(e.target.value.toUpperCase())}
            placeholder="B0XXXXXXXX"
            className={`${inputCls} mono`}
          />
          <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">10자리, B로 시작</p>
        </div>
        <div>
          <Label required>Marketplace</Label>
          <select
            value={marketplace}
            onChange={(e) => setMarketplace(e.target.value as Marketplace)}
            className={inputCls}
          >
            {MARKETPLACES.map((mp) => (
              <option key={mp} value={mp}>
                {MARKETPLACE_LABELS[mp]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] p-3">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={isPrimary}
            onChange={(e) => setIsPrimary(e.target.checked)}
          />
          <div>
            <p className="text-sm font-medium">Primary 매핑으로 지정</p>
            <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
              SKU × Marketplace 조합당 1개만 가능 (DB Partial UNIQUE).
            </p>
          </div>
        </label>
      </div>
    </>
  );
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-xs font-medium text-[var(--text-secondary)]">
      {children}
      {required && <span className="text-[var(--danger-text)] ml-0.5">*</span>}
    </label>
  );
}
