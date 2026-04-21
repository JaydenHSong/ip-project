// Design Ref: products-sync.design.md §7.3 — 3-click resolve modal
// Plan SC: SC-03 resolve ≤48h (operator 3-click UX)

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SkuSearch } from './sku-search';
import { UndoToast } from './undo-toast';
import type { UnmappedQueueRow } from '@/modules/products/features/sync/domain/types';

type Action = 'mapped' | 'created_new' | 'ignored';

type ResolveResponse = {
  resolvedId: string;
  action: Action;
  sku: string | null;
  undoExpiresAt: string | null;
};

type Props = {
  row: UnmappedQueueRow;
  onClose: () => void;
};

export function ResolveModal({ row, onClose }: Props) {
  const router = useRouter();
  const [action, setAction] = useState<Action>('mapped');
  const [sku, setSku] = useState(row.sourceSku ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [undoPayload, setUndoPayload] = useState<ResolveResponse | null>(null);

  const submit = async () => {
    setError(null);
    if (action !== 'ignored' && !sku.trim()) {
      setError('SKU를 입력하세요');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/products/unmapped/${row.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          sku: action === 'ignored' ? null : sku.trim(),
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? `HTTP ${res.status}`);
        return;
      }
      setUndoPayload(body as ResolveResponse);
      router.refresh();
      if (action === 'ignored') {
        // No undo for ignored — just close
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  if (undoPayload && undoPayload.undoExpiresAt) {
    return (
      <UndoToast
        unmappedId={undoPayload.resolvedId}
        sku={undoPayload.sku}
        expiresAt={undoPayload.undoExpiresAt}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" role="dialog">
      <div className="w-full max-w-lg rounded-xl border border-[var(--border-primary)] bg-[var(--surface-card)] p-5 shadow-xl">
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Listing Resolve</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">✕</button>
        </div>

        <dl className="mt-3 space-y-1.5 text-sm">
          <Field label="Channel" value={`${row.channel} / ${row.marketplace ?? '-'}`} />
          <Field label="External ID" value={row.externalId} mono />
          <Field label="Title" value={row.productName ?? '-'} />
          <Field label="seller_sku" value={row.sourceSku ?? '-'} mono />
          <Field label="EAN" value={row.sourceEan ?? '-'} mono />
          <Field label="Reason" value={row.reason} mono />
        </dl>

        <div className="mt-4">
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Choose action</label>
          <div className="flex gap-2 text-sm">
            {(['mapped', 'created_new', 'ignored'] as Action[]).map((a) => (
              <label key={a} className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="action"
                  checked={action === a}
                  onChange={() => setAction(a)}
                />
                <span>{a === 'mapped' ? 'Map to existing' : a === 'created_new' ? 'Create new' : 'Ignore'}</span>
              </label>
            ))}
          </div>
        </div>

        {action !== 'ignored' && (
          <div className="mt-4">
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Search SKU</label>
            <SkuSearch value={sku} onChange={setSku} />
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[var(--border-primary)] px-3 py-1.5 text-sm hover:bg-[var(--bg-hover)]"
          >
            취소
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="rounded-md bg-[var(--accent-primary)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? '처리 중…' : '확정 →'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-3">
      <dt className="w-24 shrink-0 text-xs text-[var(--text-muted)]">{label}</dt>
      <dd className={`text-sm text-[var(--text-primary)] ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  );
}
