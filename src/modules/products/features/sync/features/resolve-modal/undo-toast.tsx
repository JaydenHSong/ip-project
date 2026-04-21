// Design Ref: products-sync.design.md §7.3 — 5분 undo 타이머
// Plan SC: R5 운영자 오매핑 5분 내 revert

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  unmappedId: string;
  sku: string | null;
  expiresAt: string;
  onClose: () => void;
};

export function UndoToast({ unmappedId, sku, expiresAt, onClose }: Props) {
  const router = useRouter();
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)),
  );
  const [undoing, setUndoing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (remaining <= 0) {
      onClose();
      return;
    }
    const t = setTimeout(() => setRemaining((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining, onClose]);

  const undo = async () => {
    setUndoing(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/unmapped/${unmappedId}/undo`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'unknown' }));
        setError(body.error ?? `HTTP ${res.status}`);
        return;
      }
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setUndoing(false);
    }
  };

  const mm = String(Math.floor(remaining / 60)).padStart(1, '0');
  const ss = String(remaining % 60).padStart(2, '0');

  return (
    <div
      role="status"
      className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 shadow-lg dark:border-green-800 dark:bg-green-950"
    >
      <span className="text-green-800 dark:text-green-300 text-sm">
        ✅ {sku ? `${sku}에 매핑됨` : '처리됨'} · {mm}:{ss} 남음
      </span>
      <button
        type="button"
        onClick={undo}
        disabled={undoing}
        className="rounded-md border border-green-400 bg-white px-2 py-1 text-xs font-medium text-green-800 hover:bg-green-100 disabled:opacity-50 dark:bg-green-900 dark:text-green-300"
      >
        {undoing ? '되돌리는 중…' : '↶ 되돌리기'}
      </button>
      {error && <span className="text-red-700 text-xs">{error}</span>}
    </div>
  );
}
