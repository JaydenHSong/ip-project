'use client';

// Design Ref: CSV Import Step 2 — dry-run preview + conflict resolution

import type {
  CsvDryRunResult,
  CsvDryRunRow,
  ConflictStrategy,
} from '@/modules/products/shared/types';
import { SummaryCard, RowStatusBadge } from './shared';

type Props = {
  dryRun: CsvDryRunResult;
  fileName: string | null;
  onConflict: ConflictStrategy;
  setOnConflict: (v: ConflictStrategy) => void;
};

export function Step2Preview({ dryRun, fileName, onConflict, setOnConflict }: Props) {
  const { summary, rows } = dryRun;
  const sliced = rows.slice(0, 50);

  return (
    <>
      <div className="rounded-lg border border-[var(--border-primary)] p-3 flex items-center gap-3 text-sm">
        <span className="rounded-md bg-[var(--bg-secondary)] p-2">📄</span>
        <span className="flex-1">
          <p className="font-medium">{fileName}</p>
          <p className="text-xs text-[var(--text-tertiary)]">{summary.total} rows</p>
        </span>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-3">
        <SummaryCard label="Total" value={summary.total} />
        <SummaryCard label="✓ Valid" value={summary.valid} tone="success" />
        <SummaryCard label="⚠ Conflict" value={summary.conflicts} tone="warning" />
        <SummaryCard label="✕ Invalid" value={summary.invalid} tone="danger" />
      </div>

      {summary.conflicts > 0 && (
        <div className="mt-4 badge-warning rounded-xl p-4">
          <p className="text-sm font-medium">
            {summary.conflicts}건의 충돌이 발생했습니다 (asin+marketplace UNIQUE)
          </p>
          <div className="mt-3 flex items-center gap-4 text-sm">
            <label className="inline-flex items-center gap-1.5">
              <input
                type="radio"
                name="conflict"
                checked={onConflict === 'skip'}
                onChange={() => setOnConflict('skip')}
              />
              스킵 (기존 유지)
            </label>
            <label className="inline-flex items-center gap-1.5">
              <input
                type="radio"
                name="conflict"
                checked={onConflict === 'overwrite'}
                onChange={() => setOnConflict('overwrite')}
              />
              덮어쓰기 (새 값으로)
            </label>
          </div>
        </div>
      )}

      <div className="mt-3 rounded-xl border border-[var(--border-primary)] overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-[var(--bg-secondary)] text-[11px] uppercase tracking-wide text-[var(--text-tertiary)]">
            <tr>
              <th className="px-3 py-2 text-center">#</th>
              <th className="px-3 py-2 text-center">Status</th>
              <th className="px-3 py-2 text-left">SKU</th>
              <th className="px-3 py-2 text-left">ASIN</th>
              <th className="px-3 py-2 text-center">Market</th>
              <th className="px-3 py-2 text-left">비고</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-primary)]">
            {sliced.map((r) => (
              <PreviewRow key={r.row} row={r} />
            ))}
            {rows.length > sliced.length && (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-2 text-center text-[var(--text-muted)] text-xs"
                >
                  ... 상위 {sliced.length}행만 표시 (총 {rows.length}행)
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function PreviewRow({ row }: { row: CsvDryRunRow }) {
  const bg =
    row.status === 'conflict'
      ? 'var(--warning-bg)'
      : row.status === 'invalid'
      ? 'var(--danger-bg)'
      : undefined;

  return (
    <>
      <tr style={bg ? { background: bg } : undefined}>
        <td className="px-3 py-2 text-center text-[var(--text-tertiary)] mono">{row.row}</td>
        <td className="px-3 py-2 text-center">
          <RowStatusBadge status={row.status} />
        </td>
        <td className="px-3 py-2 mono">{row.incoming.sku || '—'}</td>
        <td className="px-3 py-2 mono">{row.incoming.asin || '—'}</td>
        <td className="px-3 py-2 text-center">{row.incoming.marketplace}</td>
        <td className="px-3 py-2 text-xs">
          {row.status === 'ok' && (
            <span className="text-[var(--text-tertiary)]">신규 매핑</span>
          )}
          {row.status === 'conflict' && (
            <span style={{ color: 'var(--warning-text)' }}>{row.message ?? '충돌'}</span>
          )}
          {row.status === 'invalid' && (
            <span style={{ color: 'var(--danger-text)' }}>{row.message ?? 'invalid'}</span>
          )}
        </td>
      </tr>
      {row.status === 'conflict' && row.existing && (
        <tr style={{ background: 'var(--warning-bg)' }}>
          <td colSpan={6} className="px-3 pb-3">
            <details>
              <summary
                className="cursor-pointer text-[11px] underline"
                style={{ color: 'var(--warning-text)' }}
              >
                기존 vs 신규 비교 ▼
              </summary>
              <div className="mt-2 grid grid-cols-2 gap-3 text-[12px]">
                <div
                  className="rounded border p-2"
                  style={{
                    borderColor: 'var(--border-primary)',
                    background: 'var(--danger-bg)',
                  }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--danger-text)' }}>
                    기존 (Before)
                  </p>
                  <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">
                    <dt className="text-[var(--text-tertiary)]">is_primary</dt>
                    <dd className="mono">{String(row.existing.isPrimary ?? '—')}</dd>
                    <dt className="text-[var(--text-tertiary)]">status</dt>
                    <dd className="mono">{row.existing.status ?? '—'}</dd>
                    <dt className="text-[var(--text-tertiary)]">updated_at</dt>
                    <dd className="mono">
                      {row.existing.updatedAt ? row.existing.updatedAt.slice(0, 10) : '—'}
                    </dd>
                  </dl>
                </div>
                <div
                  className="rounded border p-2"
                  style={{
                    borderColor: 'var(--border-primary)',
                    background: 'var(--success-bg)',
                  }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--success-text)' }}>
                    신규 (After)
                  </p>
                  <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">
                    <dt className="text-[var(--text-tertiary)]">is_primary</dt>
                    <dd className="mono">{String(row.incoming.is_primary ?? false)}</dd>
                    <dt className="text-[var(--text-tertiary)]">sku</dt>
                    <dd className="mono">{row.incoming.sku}</dd>
                    <dt className="text-[var(--text-tertiary)]">marketplace</dt>
                    <dd className="mono">{row.incoming.marketplace}</dd>
                  </dl>
                </div>
              </div>
            </details>
          </td>
        </tr>
      )}
    </>
  );
}
