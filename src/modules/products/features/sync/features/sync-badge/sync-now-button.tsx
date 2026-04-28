// Design Ref: products-sync.design.md §7.1 + FR-16
// Plan SC: 수동 sync < 30s 응답

'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Props = {
  disabled?: boolean;
};

type RunResult = {
  pipelineId: string;
  totalDurationMs: number;
  overallStatus: 'success' | 'failed' | 'partial';
  stages: Array<{
    status: string;
    rowsInserted?: number;
    rowsUpdated?: number;
    rowsMapped?: number;
    rowsUnmapped?: number;
    errorMessage?: string;
  }>;
};

export function SyncNowButton({ disabled }: Props) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);

  const trigger = async () => {
    setRunning(true);
    setToast(null);
    try {
      const res = await fetch('/api/products/sync/all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger: 'manual' }),
      });
      const body: RunResult = await res.json();
      if (!res.ok) {
        setToast({ kind: 'err', msg: `Sync failed (${res.status})` });
      } else {
        const parts = body.stages.map((s) => {
          if (s.status !== 'success') return `${s.status}`;
          const cnt = [
            s.rowsInserted ? `+${s.rowsInserted}` : null,
            s.rowsUpdated ? `~${s.rowsUpdated}` : null,
            s.rowsMapped ? `↔${s.rowsMapped}` : null,
            s.rowsUnmapped ? `⚠${s.rowsUnmapped}` : null,
          ].filter(Boolean).join(' ');
          return cnt || 'ok';
        });
        setToast({
          kind: body.overallStatus === 'failed' ? 'err' : 'ok',
          msg: `${body.overallStatus} · ${parts.join(' / ')} · ${(body.totalDurationMs / 1000).toFixed(1)}s`,
        });
        router.refresh();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setToast({ kind: 'err', msg });
    } finally {
      setRunning(false);
      setTimeout(() => setToast(null), 6000);
    }
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        disabled={disabled || running}
        onClick={trigger}
        className="rounded-lg border border-[var(--border-primary)] bg-[var(--surface-card)] px-3 py-1.5 text-sm hover:bg-[var(--bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
        title="Manually trigger products-sync pipeline"
      >
        {running ? '동기화 중…' : '🔄 지금 동기화'}
      </button>
      {toast && (
        <div
          role="status"
          className={`absolute right-0 top-full mt-1 whitespace-nowrap rounded-md px-3 py-1.5 text-xs shadow-lg z-10 ${
            toast.kind === 'ok'
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
