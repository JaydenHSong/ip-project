'use client';

// Design Ref: §5.1 Edit SlidePanel (admin) — is_primary toggle + status + audit log
// Plan SC: FR-13 (admin is_primary 편집), SC-08 (audit timeline)
//
// Sub-components split (NFR-06):
//   - audit-timeline.tsx
//   - edit-panel-body.tsx (AdminBadge, AttributesSection, CatalogSection, AuditSection)

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  apiDeleteMapping,
  apiListAudit,
  apiPatchMapping,
  formatApiError,
} from '@/modules/products/shared/client/api';
import type {
  AsinMappingRow,
  AuditEntry,
  MappingStatus,
} from '@/modules/products/shared/types';
import {
  AdminBadge,
  AttributesSection,
  CatalogSection,
  AuditSection,
} from './edit-panel-body';

type Props = {
  row: AsinMappingRow | null;
  open: boolean;
  onClose: () => void;
};

export function EditSlidePanel({ row, open, onClose }: Props) {
  const router = useRouter();
  const [isPrimary, setIsPrimary] = useState(false);
  const [status, setStatus] = useState<MappingStatus>('active');
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!row) return;
    setIsPrimary(row.isPrimary);
    setStatus(row.status);
    setError(null);
    setAudit([]);

    let cancelled = false;
    void apiListAudit({ mappingId: row.id, limit: 10 }).then((res) => {
      if (!cancelled) setAudit(res.data);
    });
    return () => { cancelled = true; };
  }, [row]);

  const handleSave = useCallback(async () => {
    if (!row) return;
    const sameP = row.isPrimary === isPrimary;
    const sameS = row.status === status;
    if (sameP && sameS) return onClose();

    setBusy(true);
    setError(null);
    try {
      await apiPatchMapping(row.id, {
        isPrimary: sameP ? undefined : isPrimary,
        status: sameS ? undefined : status,
      });
      router.refresh();
      onClose();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBusy(false);
    }
  }, [row, isPrimary, status, router, onClose]);

  const handleArchive = useCallback(async () => {
    if (!row) return;
    if (!confirm('이 매핑을 Archive(soft delete) 하시겠습니까?')) return;
    setBusy(true);
    setError(null);
    try {
      await apiDeleteMapping(row.id);
      router.refresh();
      onClose();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBusy(false);
    }
  }, [row, router, onClose]);

  if (!open || !row) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden />
      <aside className="absolute inset-y-0 right-0 w-[540px] max-w-full bg-[var(--surface-card)] border-l border-[var(--border-primary)] shadow-2xl flex flex-col">
        <header className="border-b border-[var(--border-primary)] px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
              Edit Mapping
            </p>
            <h2 className="mt-0.5 text-base font-semibold mono">
              {row.sku} · {row.asin} · {row.marketplace}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Edit SlidePanel 닫기"
            className="rounded-lg border border-[var(--border-primary)] px-3 py-1.5 text-sm hover:bg-[var(--bg-hover)]"
          >
            ✕
          </button>
        </header>

        <AdminBadge />

        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="mx-5 mt-4 badge-danger rounded-lg p-3 text-sm">{error}</div>
          )}

          <AttributesSection
            marketplace={row.marketplace}
            isPrimary={isPrimary}
            setIsPrimary={setIsPrimary}
            status={status}
            setStatus={setStatus}
          />
          <CatalogSection row={row} />
          <AuditSection entries={audit} />
        </div>

        <footer className="border-t border-[var(--border-primary)] px-5 py-3 flex items-center justify-between bg-[var(--bg-secondary)]">
          <button
            type="button"
            onClick={handleArchive}
            disabled={busy}
            className="text-sm hover:underline disabled:opacity-60"
            style={{ color: 'var(--danger-text)' }}
          >
            Archive (soft delete)
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[var(--border-primary)] bg-[var(--surface-card)] px-3 py-1.5 text-sm"
            >
              취소
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleSave}
              className="rounded-lg bg-[var(--accent)] text-white px-4 py-1.5 text-sm font-medium hover:bg-[var(--accent-hover)] disabled:opacity-60"
            >
              {busy ? '저장 중...' : '저장'}
            </button>
          </div>
        </footer>
      </aside>
    </div>
  );
}
