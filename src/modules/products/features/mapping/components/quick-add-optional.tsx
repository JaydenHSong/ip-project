'use client';

// Quick Add — optional "Catalog info for new SKU" section (split to respect NFR-06)

type Props = {
  productName: string;
  setProductName: (v: string) => void;
  brandId: string;
  setBrandId: (v: string) => void;
  color: string;
  setColor: (v: string) => void;
  deviceModel: string;
  setDeviceModel: (v: string) => void;
};

const inputCls =
  'mt-1 w-full rounded-lg border border-[var(--border-primary)] bg-[var(--surface-card)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]';

export function QuickAddOptional({
  productName,
  setProductName,
  brandId,
  setBrandId,
  color,
  setColor,
  deviceModel,
  setDeviceModel,
}: Props) {
  return (
    <details className="rounded-lg border border-[var(--border-primary)] p-3">
      <summary className="text-sm font-medium cursor-pointer">
        신규 SKU일 때 필요 (Catalog 정보)
      </summary>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-[var(--text-secondary)]">제품명 (EN)</label>
          <input
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--text-secondary)]">브랜드 ID</label>
          <input
            value={brandId}
            onChange={(e) => setBrandId(e.target.value)}
            placeholder="brand row UUID"
            className={`${inputCls} mono text-[12px]`}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--text-secondary)]">색상</label>
          <input
            value={color}
            onChange={(e) => setColor(e.target.value)}
            placeholder="Black"
            className={inputCls}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--text-secondary)]">기종</label>
          <input
            value={deviceModel}
            onChange={(e) => setDeviceModel(e.target.value)}
            placeholder="iPhone 17 Pro Max"
            className={inputCls}
          />
        </div>
      </div>
      <p className="mt-2 text-[11px] text-[var(--text-tertiary)]">
        💡 기존 SKU라면 비워도 됩니다 (products 테이블에서 자동 조회).
      </p>
    </details>
  );
}
