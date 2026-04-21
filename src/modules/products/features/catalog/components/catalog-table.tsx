// Design Ref: §4.2 catalog table rendering (Server Component)
// Plan SC: UI reflects Spigen 자재 리스팅 포맷 (자재/자재내역/배치/단가/원산지/브랜드/기종/색상/모델명KO/EAN)

import Link from 'next/link';
import type { Product, LifecycleStatus } from '@/modules/products/shared/types';

type Props = {
  rows: Product[];
  brandName?: (brandId: string) => string | undefined;
};

export function CatalogTable({ rows, brandName }: Props) {
  if (rows.length === 0) return <EmptyState />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead className="bg-[var(--bg-secondary)] text-[11px] uppercase tracking-wide text-[var(--text-tertiary)]">
          <tr>
            <Th sticky>자재 (SKU)</Th>
            <Th>자재 내역</Th>
            <Th align="center">배치</Th>
            <Th align="right">단가</Th>
            <Th align="center">원산지</Th>
            <Th>브랜드</Th>
            <Th>기종</Th>
            <Th>색상</Th>
            <Th>모델명 (KO)</Th>
            <Th>EAN 바코드</Th>
            <Th align="center">상태</Th>
            <Th align="center">Action</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-primary)]">
          {rows.map((p) => (
            <tr key={p.id} className="hover:bg-[var(--bg-hover)]">
              <Td sticky>
                <Link
                  href={`/products/${encodeURIComponent(p.sku)}?version=${encodeURIComponent(p.version)}`}
                  className="mono text-[var(--text-primary)] font-medium hover:underline"
                >
                  {p.sku}
                </Link>
              </Td>
              <Td>
                <Link
                  href={`/products/${encodeURIComponent(p.sku)}?version=${encodeURIComponent(p.version)}`}
                  className="hover:underline"
                >
                  {p.productNameKo ?? p.productName}
                </Link>
              </Td>
              <Td align="center">
                <VersionBadge version={p.version} />
              </Td>
              <Td align="right" mono>
                {formatPrice(p.unitPrice)}
              </Td>
              <Td align="center" mono muted>
                {p.originCountry ?? '—'}
              </Td>
              <Td>{brandName?.(p.brandId) ?? '—'}</Td>
              <Td muted>{p.deviceModel ?? '—'}</Td>
              <Td>
                {p.color ? (
                  <span className="inline-flex items-center gap-1.5">
                    <ColorChip color={p.color} />
                    {p.color}
                  </span>
                ) : (
                  <span className="text-[var(--text-muted)]">—</span>
                )}
              </Td>
              <Td>{p.modelNameKo ?? '—'}</Td>
              <Td mono muted>
                {p.eanBarcode ?? '—'}
              </Td>
              <Td align="center">
                <LifecycleBadge status={p.lifecycleStatus} />
              </Td>
              <Td align="center">
                <button
                  type="button"
                  className="text-[var(--text-muted)] hover:text-[var(--accent)]"
                  aria-label="행 액션 메뉴"
                >
                  ⋯
                </button>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VersionBadge({ version }: { version: string }) {
  const variant = versionVariant(version);
  const cls: Record<'neutral' | 'warning' | 'violet', string> = {
    neutral: 'badge-neutral',
    warning: 'badge-warning',
    violet: 'badge-violet',
  };
  return (
    <span
      className={`${cls[variant]} inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium`}
    >
      {version}
    </span>
  );
}

function versionVariant(version: string): 'neutral' | 'warning' | 'violet' {
  if (version === 'V0') return 'warning';
  if (/^V[2-9]$/i.test(version) || /^V1\d+$/i.test(version)) return 'violet';
  return 'neutral';
}

function LifecycleBadge({ status }: { status: LifecycleStatus }) {
  const map: Record<
    LifecycleStatus,
    { variant: 'success' | 'info' | 'warning' | 'neutral'; label: string }
  > = {
    active: { variant: 'success', label: 'Active' },
    new: { variant: 'info', label: 'New' },
    eol: { variant: 'warning', label: 'EOL' },
    discontinued: { variant: 'neutral', label: 'Discontinued' },
  };
  const { variant, label } = map[status];
  return (
    <span
      className={`badge-${variant} inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium`}
    >
      {label}
    </span>
  );
}

function ColorChip({ color }: { color: string }) {
  const bg = COLOR_HEX[color.toLowerCase()] ?? 'var(--text-muted)';
  return (
    <span
      className="inline-block w-3 h-3 rounded-full border border-[var(--border-secondary)]"
      style={{ background: bg }}
      aria-hidden
    />
  );
}

const COLOR_HEX: Record<string, string> = {
  black: '#1a1a1a',
  'matte black': '#222',
  'abyss green': '#0f2b22',
  gunmetal: '#3a3e44',
  'metal slate': '#7a8690',
  gray: '#9aa0a6',
  'crystal clear': '#eef2ff',
  white: '#f5f5f5',
};

function Th({
  children,
  align = 'left',
  sticky,
}: {
  children: React.ReactNode;
  align?: 'left' | 'center' | 'right';
  sticky?: boolean;
}) {
  const base = `px-3 py-2 text-${align}`;
  return <th className={sticky ? `${base} sticky left-0 bg-[var(--bg-secondary)]` : base}>{children}</th>;
}

function Td({
  children,
  align = 'left',
  muted,
  mono,
  sticky,
}: {
  children: React.ReactNode;
  align?: 'left' | 'center' | 'right';
  muted?: boolean;
  mono?: boolean;
  sticky?: boolean;
}) {
  const parts = ['px-3 py-2', `text-${align}`];
  if (muted) parts.push('text-[var(--text-tertiary)]');
  if (mono) parts.push('mono');
  if (sticky) parts.push('sticky left-0 bg-[var(--surface-card)]');
  return <td className={parts.join(' ')}>{children}</td>;
}

function EmptyState() {
  return (
    <div className="p-12 text-center">
      <p className="text-base font-medium">아직 제품이 없습니다.</p>
      <p className="mt-1 text-sm text-[var(--text-tertiary)]">
        CSV를 업로드하거나 /products/mapping에서 신규 SKU를 등록하세요.
      </p>
    </div>
  );
}

function formatPrice(value: number | null): string {
  if (value === null) return '—';
  return `$${value.toFixed(2)}`;
}
