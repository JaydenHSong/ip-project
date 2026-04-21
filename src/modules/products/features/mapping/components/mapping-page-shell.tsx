'use client';

// Design Ref: §5.1 mapping page — modal entry points
// Plan SC: US-02 (CSV bulk), US-03 (Quick Add), US-07 (Admin edit)
//
// Shell holds modal open/close state so the Server Component page stays a
// Server Component. Receives the pre-fetched row for ?edit=<id> auto-open.

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { AsinMappingRow } from '@/modules/products/shared/types';
import { CsvImportDrawer } from './csv-import-drawer';
import { QuickAddModal } from './quick-add-modal';
import { EditSlidePanel } from './edit-slide-panel';

type ModalState = null | 'import' | 'quickAdd' | 'edit';

type Props = {
  /** Pre-fetched row when URL has ?edit=<id>. Null when no edit param. */
  editRow: AsinMappingRow | null;
};

export function MappingPageShell({ editRow }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Derive initial modal state from URL: ?edit=<id> auto-opens EditSlidePanel
  const [modal, setModal] = useState<ModalState>(() =>
    searchParams.get('edit') && editRow ? 'edit' : null
  );

  // Keep editRow in state so it persists while panel is animating closed
  const [activeEditRow, setActiveEditRow] = useState<AsinMappingRow | null>(editRow);

  // If parent re-renders with a new editRow (e.g. navigation), sync it
  useEffect(() => {
    if (editRow) {
      setActiveEditRow(editRow);
      setModal('edit');
    }
  }, [editRow]);

  const openImport = useCallback(() => setModal('import'), []);
  const openQuickAdd = useCallback(() => setModal('quickAdd'), []);

  const closeModal = useCallback(() => {
    setModal(null);
    // Remove ?edit= from URL without full navigation
    const sp = new URLSearchParams(searchParams.toString());
    if (sp.has('edit')) {
      sp.delete('edit');
      router.replace(`?${sp.toString()}`, { scroll: false });
    }
  }, [router, searchParams]);

  return (
    <>
      {/* Action buttons rendered in page header slot via portal-free approach:
          the page renders this shell BELOW the header, but the buttons are
          hoisted visually via absolute/sticky positioning from the parent layout.
          Simpler: we render them here as a sticky action bar above the table. */}
      <ActionBar onImport={openImport} onQuickAdd={openQuickAdd} />

      <CsvImportDrawer open={modal === 'import'} onClose={closeModal} />
      <QuickAddModal open={modal === 'quickAdd'} onClose={closeModal} />
      <EditSlidePanel
        row={activeEditRow}
        open={modal === 'edit'}
        onClose={closeModal}
      />
    </>
  );
}

function ActionBar({
  onImport,
  onQuickAdd,
}: {
  onImport: () => void;
  onQuickAdd: () => void;
}) {
  return (
    <div className="flex items-center gap-2 px-8 py-3 border-b border-[var(--border-primary)] bg-[var(--surface-card)]">
      <button
        type="button"
        onClick={onImport}
        aria-label="CSV 파일로 ASIN 매핑 일괄 가져오기"
        className="flex items-center gap-1.5 rounded-lg border border-[var(--border-primary)] bg-[var(--surface-card)] px-3 py-1.5 text-sm hover:bg-[var(--bg-hover)]"
      >
        <span aria-hidden>↑</span> Import CSV
      </button>
      <button
        type="button"
        onClick={onQuickAdd}
        aria-label="새 ASIN 매핑 단건 추가"
        className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] text-white px-3 py-1.5 text-sm font-medium hover:bg-[var(--accent-hover)]"
      >
        <span aria-hidden>+</span> Quick Add
      </button>
    </div>
  );
}
