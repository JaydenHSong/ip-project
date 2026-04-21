// Client boundary for opening the resolve modal from an RSC-rendered row.

'use client';

import { useState } from 'react';
import { ResolveModal } from '../resolve-modal/resolve-modal';
import type { UnmappedQueueRow } from '@/modules/products/features/sync/domain/types';

type Props = {
  row: UnmappedQueueRow;
};

export function ResolveButton({ row }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-[var(--border-primary)] bg-[var(--surface-card)] px-2 py-1 text-xs hover:bg-[var(--bg-hover)]"
      >
        🔍 매칭
      </button>
      {open && <ResolveModal row={row} onClose={() => setOpen(false)} />}
    </>
  );
}
