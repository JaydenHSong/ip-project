// Design Ref: §4.2 mapping-table (Server Component)
// Plan SC: SC-07 shape — renders AsinMappingRow[] without mutating contract
//
// NOTE: Server Component. Mutation actions (Edit/Archive) are handled by
// a future client component in module-5 (EditSlidePanel).

import Link from 'next/link';
import type {
  AsinMappingRow,
  MappingStatus,
} from '@/modules/products/shared/types';
import { MARKETPLACE_LABELS } from '@/modules/products/shared/constants';

type Props = {
  rows: AsinMappingRow[];
  onEditHref?: (row: AsinMappingRow) => string;
};

export function MappingTable({ rows, onEditHref }: Props) {
  if (rows.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead className="bg-[var(--bg-secondary)] text-[11px] uppercase tracking-wide text-[var(--text-tertiary)]">
          <tr>
            <Th sticky>SKU</Th>
            <Th>자재 내역</Th>
            <Th align="center">배치</Th>
            <Th>ASIN</Th>
            <Th align="center">마켓</Th>
            <Th align="center">Primary</Th>
            <Th>기종</Th>
            <Th>색상</Th>
            <Th>모델명 (KO)</Th>
            <Th align="center">상태</Th>
            <Th>최종 수정</Th>
            <Th align="center">Actions</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-primary)]">
          {rows.map((r, index) => (
            <MappingRow
              key={r.id}
              row={r}
              repeatSku={rows[index - 1]?.sku === r.sku}
              editHref={onEditHref?.(r)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MappingRow({
  row,
  repeatSku,
  editHref,
}: {
  row: AsinMappingRow;
  repeatSku: boolean;
  editHref?: string;
}) {
  return (
    <tr className="hover:bg-[var(--bg-hover)]">
      <Td sticky>
        <span
          className={`mono ${repeatSku ? 'text-[var(--text-muted)]' : 'text-[var(--text-primary)] font-medium'}`}
        >
          {row.sku || '—'}
        </span>
      </Td>
      <Td>
        {repeatSku ? (
          <span className="text-[var(--text-muted)] text-xs">↳ 동일 SKU</span>
        ) : (
          row.productNameKo ?? row.productName ?? '—'
        )}
      </Td>
      <Td align="center">
        <Badge variant="neutral">{row.version}</Badge>
      </Td>
      <Td>
        <span className="mono">{row.asin}</span>
      </Td>
      <Td align="center">{MARKETPLACE_LABELS[row.marketplace] ?? row.marketplace}</Td>
      <Td align="center">
        {row.isPrimary ? (
          <Badge variant="primary">PRI</Badge>
        ) : (
          <span className="text-[var(--text-muted)] text-[11px]">—</span>
        )}
      </Td>
      <Td muted>{row.deviceModel ?? '—'}</Td>
      <Td>
        {row.color ? (
          <span className="inline-flex items-center gap-1.5">
            <ColorChip color={row.color} />
            {row.color}
          </span>
        ) : (
          <span className="text-[var(--text-muted)]">—</span>
        )}
      </Td>
      <Td>{row.modelNameKo ?? '—'}</Td>
      <Td align="center">
        <StatusBadge status={row.status} />
      </Td>
      <Td muted>
        <span className="text-xs mono">{formatRelative(row.updatedAt)}</span>
      </Td>
      <Td align="center">
        {editHref ? (
          <Link
            href={editHref}
            className="text-[var(--text-tertiary)] hover:text-[var(--accent)] underline-offset-2 hover:underline"
          >
            Edit
          </Link>
        ) : (
          <span className="text-[var(--text-muted)]">—</span>
        )}
      </Td>
    </tr>
  );
}

function StatusBadge({ status }: { status: MappingStatus }) {
  const map: Record<MappingStatus, { variant: 'success' | 'warning' | 'neutral'; label: string }> = {
    active: { variant: 'success', label: 'Active' },
    paused: { variant: 'warning', label: 'Paused' },
    archived: { variant: 'neutral', label: 'Archived' },
  };
  const { variant, label } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
}

type BadgeVariant = 'success' | 'warning' | 'neutral' | 'primary' | 'violet';
function Badge({ variant, children }: { variant: BadgeVariant; children: React.ReactNode }) {
  const cls: Record<BadgeVariant, string> = {
    success: 'badge-success',
    warning: 'badge-warning',
    neutral: 'badge-neutral',
    primary: 'badge-primary',
    violet: 'badge-violet',
  };
  return (
    <span
      className={`${cls[variant]} inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium`}
    >
      {children}
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
  sticky,
}: {
  children: React.ReactNode;
  align?: 'left' | 'center' | 'right';
  muted?: boolean;
  sticky?: boolean;
}) {
  const parts = ['px-3 py-2', `text-${align}`];
  if (muted) parts.push('text-[var(--text-tertiary)]');
  if (sticky) parts.push('sticky left-0 bg-[var(--surface-card)]');
  return <td className={parts.join(' ')}>{children}</td>;
}

function EmptyState() {
  return (
    <div className="p-12 text-center">
      <p className="text-base font-medium">아직 매핑이 없습니다.</p>
      <p className="mt-1 text-sm text-[var(--text-tertiary)]">
        CSV를 업로드하거나 Quick Add로 첫 매핑을 시작하세요.
      </p>
    </div>
  );
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';
  const diffMs = Date.now() - then;
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.round(diffH / 24);
  if (diffD < 30) return `${diffD}d ago`;
  return new Date(iso).toISOString().slice(0, 10);
}
