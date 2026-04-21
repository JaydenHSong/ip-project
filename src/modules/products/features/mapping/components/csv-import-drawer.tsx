'use client';

// Design Ref: §5.2 CSV Import 3-step flow (orchestrator)
// Plan SC: SC-01 (CSV import <60s), FR-04 (preview + conflict + result)
//
// Sub-components split to respect NFR-06 (<=250 lines):
//   - step-1-drop.tsx
//   - step-2-preview.tsx
//   - step-3-result.tsx
//   - shared.tsx (Steps indicator, SummaryCard, RowStatusBadge, ErrorBanner)

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import {
  apiBulkUpsert,
  apiDryRun,
  formatApiError,
} from '@/modules/products/shared/client/api';
import type {
  BulkUpsertResponse,
  ConflictStrategy,
  CsvDryRunResult,
  CsvImportRow,
} from '@/modules/products/shared/types';
import { Steps, ErrorBanner, type Step } from './csv-import/shared';
import { Step1Drop } from './csv-import/step-1-drop';
import { Step2Preview } from './csv-import/step-2-preview';
import { Step3Result } from './csv-import/step-3-result';

type Props = {
  open: boolean;
  onClose: () => void;
};

export function CsvImportDrawer({ open, onClose }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dryRun, setDryRun] = useState<CsvDryRunResult | null>(null);
  const [onConflict, setOnConflict] = useState<ConflictStrategy>('skip');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<BulkUpsertResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStep(1);
    setFileName(null);
    setDryRun(null);
    setOnConflict('skip');
    setResult(null);
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setFileName(file.name);
    const text = await file.text();
    setBusy(true);
    try {
      const dr = await apiDryRun(text);
      setDryRun(dr);
      setStep(2);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBusy(false);
    }
  }, []);

  const handleCommit = useCallback(async () => {
    if (!dryRun) return;
    setBusy(true);
    setError(null);
    try {
      const rows: CsvImportRow[] = dryRun.rows
        .filter((r) => r.status !== 'invalid')
        .map((r) => r.incoming);
      const res = await apiBulkUpsert(rows, onConflict);
      setResult(res);
      setStep(3);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBusy(false);
    }
  }, [dryRun, onConflict]);

  const handleDone = useCallback(() => {
    router.refresh();
    handleClose();
  }, [router, handleClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} aria-hidden />
      <aside className="absolute inset-y-0 right-0 w-[960px] max-w-full bg-[var(--surface-card)] border-l border-[var(--border-primary)] shadow-2xl flex flex-col">
        <header className="border-b border-[var(--border-primary)] px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">Import CSV</p>
            <h2 className="mt-0.5 text-lg font-semibold">ASIN 매핑 대량 가져오기</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="CSV Import 닫기"
            className="rounded-lg border border-[var(--border-primary)] px-3 py-1.5 text-sm hover:bg-[var(--bg-hover)]"
          >
            ✕ 닫기
          </button>
        </header>

        <Steps step={step} />

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {error && <ErrorBanner message={error} />}

          {step === 1 && (
            <Step1Drop fileName={fileName} busy={busy} onFile={handleFile} />
          )}

          {step === 2 && dryRun && (
            <Step2Preview
              dryRun={dryRun}
              fileName={fileName}
              onConflict={onConflict}
              setOnConflict={setOnConflict}
            />
          )}

          {step === 3 && result && <Step3Result result={result} />}
        </div>

        <footer className="border-t border-[var(--border-primary)] px-6 py-3 flex items-center justify-between bg-[var(--bg-secondary)]">
          <div />
          <div className="flex items-center gap-2">
            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-lg border border-[var(--border-primary)] bg-[var(--surface-card)] px-3 py-1.5 text-sm"
              >
                ← 이전
              </button>
            )}
            {step === 2 && dryRun && (
              <button
                type="button"
                disabled={busy || dryRun.summary.total - dryRun.summary.invalid <= 0}
                onClick={handleCommit}
                className="rounded-lg bg-[var(--accent)] text-white px-4 py-1.5 text-sm font-medium hover:bg-[var(--accent-hover)] disabled:opacity-60"
              >
                {busy
                  ? '임포트 중...'
                  : `${(dryRun.summary.total - dryRun.summary.invalid).toLocaleString()}건 확정 →`}
              </button>
            )}
            {step === 3 && (
              <button
                type="button"
                onClick={handleDone}
                className="rounded-lg bg-[var(--accent)] text-white px-4 py-1.5 text-sm font-medium hover:bg-[var(--accent-hover)]"
              >
                완료
              </button>
            )}
          </div>
        </footer>
      </aside>
    </div>
  );
}
