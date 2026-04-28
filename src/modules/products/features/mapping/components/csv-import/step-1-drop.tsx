'use client';

// Design Ref: CSV Import Step 1 — file selection

import { useRef } from 'react';

type Props = {
  fileName: string | null;
  busy: boolean;
  onFile: (file: File) => void;
};

export function Step1Drop({ fileName, busy, onFile }: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="rounded-xl border-2 border-dashed border-[var(--border-secondary)] p-10 text-center">
      <p className="font-medium">CSV 파일을 선택하거나 드래그하세요</p>
      <p className="mt-1 text-xs text-[var(--text-tertiary)]">
        필수 헤더: <code className="mono">sku, asin, marketplace</code> · 선택:{' '}
        <code className="mono">is_primary, brand_id, version, color, ...</code>
      </p>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => fileRef.current?.click()}
        className="mt-5 rounded-lg bg-[var(--accent)] text-white px-4 py-2 text-sm font-medium hover:bg-[var(--accent-hover)] disabled:opacity-60"
      >
        {busy ? '파싱 중...' : '파일 선택'}
      </button>
      {fileName && (
        <p className="mt-3 text-xs text-[var(--text-tertiary)]">선택됨: {fileName}</p>
      )}
    </div>
  );
}
