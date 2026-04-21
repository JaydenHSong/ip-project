// Design Ref: products-sync.design.md §7.2 — 채널/브랜드/사유/유입일 필터
// Plan SC: FR-09 URL searchParams

'use client';

import { useRouter, useSearchParams } from 'next/navigation';

const CHANNEL_OPTIONS = [
  { value: '', label: '전체 채널' },
  { value: 'amazon', label: 'Amazon' },
  { value: 'shopify', label: 'Shopify' },
  { value: 'ebay', label: 'eBay' },
  { value: 'ml', label: 'MercadoLibre' },
] as const;

const MARKETPLACE_OPTIONS = [
  { value: '', label: '전체 마켓플레이스' },
  { value: 'US', label: '🇺🇸 US' },
  { value: 'CA', label: '🇨🇦 CA' },
];

const REASON_OPTIONS = [
  { value: '', label: '전체 사유' },
  { value: 'no_ean_no_prefix', label: 'EAN 없음 + SKU 불일치' },
  { value: 'prefix_ambiguous', label: 'SKU prefix 중복' },
  { value: 'invalid_sku_format', label: 'SKU 형식 오류' },
  { value: 'schema_drift', label: '스키마 변경' },
  { value: 'manual_flag', label: '수동 플래그' },
];

const STATUS_OPTIONS = [
  { value: 'pending', label: '대기' },
  { value: 'resolved', label: '해결됨' },
  { value: 'ignored', label: '무시' },
];

export function UnmappedFilters() {
  const router = useRouter();
  const params = useSearchParams();

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page'); // reset pagination on filter change
    router.push(`?${next.toString()}`);
  };

  const selectClass =
    'rounded-md border border-[var(--border-primary)] bg-[var(--surface-card)] px-2 py-1.5 text-sm text-[var(--text-primary)]';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        className={selectClass}
        value={params.get('channel') ?? ''}
        onChange={(e) => set('channel', e.target.value)}
      >
        {CHANNEL_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <select
        className={selectClass}
        value={params.get('marketplace') ?? ''}
        onChange={(e) => set('marketplace', e.target.value)}
      >
        {MARKETPLACE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <select
        className={selectClass}
        value={params.get('reason') ?? ''}
        onChange={(e) => set('reason', e.target.value)}
      >
        {REASON_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <select
        className={selectClass}
        value={params.get('status') ?? 'pending'}
        onChange={(e) => set('status', e.target.value)}
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
