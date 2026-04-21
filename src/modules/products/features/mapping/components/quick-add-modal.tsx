'use client';

// Design Ref: §5.1 Quick Add modal — 단일 매핑 추가
// Plan SC: FR-09 (Quick-add 웹 폼)
//
// Sub-components split (NFR-06):
//   - quick-add-form.tsx (core fields: SKU/ASIN/Marketplace/Primary)
//   - quick-add-optional.tsx (collapsible catalog info)

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import {
  apiBulkUpsert,
  formatApiError,
} from '@/modules/products/shared/client/api';
import { ASIN_REGEX } from '@/modules/products/shared/constants';
import type { CsvImportRow, Marketplace } from '@/modules/products/shared/types';
import { QuickAddForm } from './quick-add-form';
import { QuickAddOptional } from './quick-add-optional';

type Props = {
  open: boolean;
  onClose: () => void;
};

export function QuickAddModal({ open, onClose }: Props) {
  const router = useRouter();
  const [sku, setSku] = useState('');
  const [asin, setAsin] = useState('');
  const [marketplace, setMarketplace] = useState<Marketplace>('US');
  const [isPrimary, setIsPrimary] = useState(true);
  const [color, setColor] = useState('');
  const [deviceModel, setDeviceModel] = useState('');
  const [version, setVersion] = useState('V1');
  const [brandId, setBrandId] = useState('');
  const [productName, setProductName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const reset = useCallback(() => {
    setSku(''); setAsin(''); setMarketplace('US'); setIsPrimary(true);
    setColor(''); setDeviceModel(''); setVersion('V1'); setBrandId('');
    setProductName(''); setError(null); setSuccess(null);
  }, []);

  const handleClose = useCallback(() => { reset(); onClose(); }, [onClose, reset]);

  const handleSubmit = useCallback(
    async (andNext: boolean) => {
      setError(null);
      setSuccess(null);

      if (!sku.trim()) return setError('SKU는 필수입니다');
      if (!ASIN_REGEX.test(asin.trim())) {
        return setError('ASIN은 B로 시작하는 10자리 영숫자여야 합니다');
      }

      const row: CsvImportRow = {
        sku: sku.trim(),
        asin: asin.trim(),
        marketplace,
        is_primary: isPrimary,
        version: version || 'V1',
        color: color || undefined,
        device_model: deviceModel || undefined,
        brand_id: brandId || undefined,
        product_name: productName || undefined,
      };

      setBusy(true);
      try {
        const res = await apiBulkUpsert([row], 'skip');
        if (res.summary.failed > 0) {
          setError(`저장 실패: ${res.errors[0]?.message ?? '알 수 없는 오류'}`);
          return;
        }
        router.refresh();
        if (andNext) {
          setSuccess(`${sku} 저장됨 — 다음 행 입력`);
          setAsin('');
          setIsPrimary(true);
        } else {
          handleClose();
        }
      } catch (err) {
        setError(formatApiError(err));
      } finally {
        setBusy(false);
      }
    },
    [sku, asin, marketplace, isPrimary, version, color, deviceModel, brandId, productName, router, handleClose]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} aria-hidden />

      <div className="relative w-full max-w-2xl rounded-2xl bg-[var(--surface-card)] border border-[var(--border-primary)] shadow-2xl">
        <header className="border-b border-[var(--border-primary)] px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wide">Quick Add</p>
            <h2 className="mt-0.5 text-lg font-semibold">새 ASIN 매핑 추가</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Quick Add 모달 닫기"
            className="rounded-lg border border-[var(--border-primary)] px-3 py-1.5 text-sm hover:bg-[var(--bg-hover)]"
          >
            ✕
          </button>
        </header>

        <form
          className="px-6 py-5 space-y-4"
          onSubmit={(e) => { e.preventDefault(); void handleSubmit(false); }}
        >
          {error && <div className="badge-danger rounded-lg p-3 text-sm">{error}</div>}
          {success && <div className="badge-success rounded-lg p-3 text-sm">{success}</div>}

          <QuickAddForm
            sku={sku} setSku={setSku}
            version={version} setVersion={setVersion}
            asin={asin} setAsin={setAsin}
            marketplace={marketplace} setMarketplace={setMarketplace}
            isPrimary={isPrimary} setIsPrimary={setIsPrimary}
          />

          <QuickAddOptional
            productName={productName} setProductName={setProductName}
            brandId={brandId} setBrandId={setBrandId}
            color={color} setColor={setColor}
            deviceModel={deviceModel} setDeviceModel={setDeviceModel}
          />
        </form>

        <footer className="border-t border-[var(--border-primary)] px-6 py-3 flex items-center justify-between bg-[var(--bg-secondary)] rounded-b-2xl">
          <p className="text-[11px] text-[var(--text-tertiary)]">
            저장하고 다음 행: 같은 SKU로 빠르게 연속 입력
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-[var(--border-primary)] bg-[var(--surface-card)] px-3 py-1.5 text-sm hover:bg-[var(--bg-hover)]"
            >
              취소
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleSubmit(true)}
              className="rounded-lg bg-[var(--accent)] text-white px-4 py-1.5 text-sm font-medium hover:bg-[var(--accent-hover)] disabled:opacity-60"
            >
              저장하고 다음
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleSubmit(false)}
              className="rounded-lg bg-[var(--accent)] text-white px-4 py-1.5 text-sm font-medium hover:bg-[var(--accent-hover)] disabled:opacity-60"
            >
              {busy ? '저장 중...' : '저장'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
