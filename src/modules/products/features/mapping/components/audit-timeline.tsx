'use client';

// Audit log timeline — split from edit-slide-panel to respect NFR-06

import type { AuditEntry } from '@/modules/products/shared/types';

type Props = {
  entries: AuditEntry[];
};

export function AuditTimeline({ entries }: Props) {
  if (entries.length === 0) {
    return <p className="mt-3 text-xs text-[var(--text-tertiary)]">로드 중 또는 이력 없음</p>;
  }

  return (
    <ol className="mt-4 space-y-4 text-sm relative">
      <div
        className="absolute left-1.5 top-1 bottom-1 w-px"
        style={{ background: 'var(--border-primary)' }}
        aria-hidden
      />
      {entries.map((e, i) => (
        <li key={e.id} className="relative pl-6">
          <span
            className="absolute left-0 top-1 size-3 rounded-full"
            style={{
              background: i === 0 ? 'var(--accent)' : 'var(--text-muted)',
              boxShadow: '0 0 0 4px var(--surface-card)',
            }}
            aria-hidden
          />
          <div className="flex items-center justify-between">
            <p className="font-medium">
              {e.action}{' '}
              <span className="font-normal text-[var(--text-tertiary)]">{summarizeDiff(e)}</span>
            </p>
            <p className="text-[11px] text-[var(--text-tertiary)] mono">{relative(e.createdAt)}</p>
          </div>
          <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">source={e.source}</p>
        </li>
      ))}
    </ol>
  );
}

function summarizeDiff(e: AuditEntry): string {
  if (e.action === 'CREATE') return 'new row';
  if (e.action === 'DELETE') return 'removed';
  if (!e.before || !e.after) return 'updated';
  const changes: string[] = [];
  for (const key of ['is_primary', 'status']) {
    const b = (e.before as Record<string, unknown>)[key];
    const a = (e.after as Record<string, unknown>)[key];
    if (b !== a) changes.push(`${key}: ${String(b)} → ${String(a)}`);
  }
  return changes.length > 0 ? changes.join(', ') : 'updated';
}

function relative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return iso;
  const min = Math.round(ms / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}
