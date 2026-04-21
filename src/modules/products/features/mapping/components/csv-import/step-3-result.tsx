'use client';

// Design Ref: CSV Import Step 3 — result summary

import type { BulkUpsertResponse } from '@/modules/products/shared/types';
import { SummaryCard } from './shared';

type Props = {
  result: BulkUpsertResponse;
};

export function Step3Result({ result }: Props) {
  return (
    <div>
      <p className="text-base font-semibold">임포트 완료</p>
      <div className="mt-4 grid grid-cols-3 gap-3">
        <SummaryCard label="Inserted" value={result.summary.inserted} tone="success" />
        <SummaryCard label="Updated" value={result.summary.updated} tone="info" />
        <SummaryCard label="Failed" value={result.summary.failed} tone="danger" />
      </div>

      {result.errors.length > 0 && (
        <div className="mt-4 rounded-xl border border-[var(--border-primary)] p-4">
          <p className="text-sm font-medium">오류 {result.errors.length}건</p>
          <ul className="mt-2 text-xs space-y-1 max-h-64 overflow-y-auto">
            {result.errors.map((e, i) => (
              <li
                key={`${e.row}-${i}`}
                className="mono"
                style={{ color: 'var(--danger-text)' }}
              >
                row {e.row}: {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
