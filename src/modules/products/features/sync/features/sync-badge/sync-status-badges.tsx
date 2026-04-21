// Design Ref: products-sync.design.md §7.1 — /products 상단 Sync Status 배지
// Plan SC: FR-15 — 2개 배지 (ERP sync / Channel match)

'use client';

import { useEffect, useState } from 'react';
import type { StageSummary } from '@/modules/products/features/sync/queries';

type Props = {
  initial: { erp: StageSummary | null; channel_match: StageSummary | null };
};

type ColorToken = 'ok' | 'warn' | 'fail' | 'run';

function statusColor(status: string | null, finishedAt: string | null): ColorToken {
  if (status === 'running') return 'run';
  if (status === 'failed' || status === 'schema_drift') return 'fail';
  if (!finishedAt) return 'warn';
  const ageHours = (Date.now() - new Date(finishedAt).getTime()) / 1000 / 3600;
  if (ageHours > 48) return 'fail';
  if (ageHours > 24) return 'warn';
  return 'ok';
}

function relativeTime(iso: string | null): string {
  if (!iso) return 'never';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 60) return `${min}m ago`;
  const h = Math.round(min / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

const COLOR_CLASSES: Record<ColorToken, string> = {
  ok:   'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300',
  warn: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300',
  fail: 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300',
  run:  'border-blue-200 bg-blue-50 text-blue-800 animate-pulse dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300',
};

export function SyncStatusBadges({ initial }: Props) {
  const [summaries, setSummaries] = useState(initial);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch('/api/products/unmapped?limit=1', { cache: 'no-store' });
        if (!res.ok) return;
        const body = await res.json();
        // lastSyncedAt is in channel_match latest summary; refresh via separate endpoint is ideal,
        // but we reuse listUnmapped's last_synced_at which reflects channel_match.
        // For erp freshness, we'd need /api/products/sync/status — deferred (P1).
        if (body.lastSyncedAt) {
          setSummaries((prev) => ({
            ...prev,
            channel_match: prev.channel_match
              ? { ...prev.channel_match, finishedAt: body.lastSyncedAt }
              : null,
          }));
        }
      } catch { /* swallow */ }
    };
    const t = setInterval(poll, 60_000);
    return () => clearInterval(t);
  }, []);

  const erp = summaries.erp;
  const ch = summaries.channel_match;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Badge
        title="ERP sync"
        color={erp ? statusColor(erp.status, erp.finishedAt) : 'warn'}
        time={erp ? relativeTime(erp.finishedAt) : 'never'}
        detail={erp ? `+${erp.rowsInserted} SKU · ${erp.rowsUpdated} updated` : 'no run yet'}
      />
      <Badge
        title="Channel match"
        color={ch ? statusColor(ch.status, ch.finishedAt) : 'warn'}
        time={ch ? relativeTime(ch.finishedAt) : 'never'}
        detail={ch ? `+${ch.rowsMapped} mapped · ${ch.rowsUnmapped} unmapped` : 'no run yet'}
      />
    </div>
  );
}

function Badge({ title, color, time, detail }: { title: string; color: ColorToken; time: string; detail: string }) {
  return (
    <div className={`rounded-lg border px-3 py-1.5 text-xs ${COLOR_CLASSES[color]}`}>
      <div className="font-medium">{title} · {time}</div>
      <div className="text-[10px] opacity-80">{detail}</div>
    </div>
  );
}
