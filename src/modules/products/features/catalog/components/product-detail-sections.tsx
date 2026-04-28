// Design Ref: §5.1 Product Detail page sections (split for NFR-06)
// Server Components — pure render from Product

import type { Product } from '@/modules/products/shared/types';

type MappingLite = {
  id: string;
  asin: string;
  marketplace: string;
  isPrimary: boolean;
};

export function BasicInfo({ product }: { product: Product }) {
  return (
    <Card title="기본 정보" right="products.products">
      <dl className="grid grid-cols-3 gap-x-6 gap-y-4 p-5">
        <Field label="자재 (SKU)" value={product.sku} mono />
        <Field label="배치" value={product.version} />
        <Field
          label="단가"
          value={product.unitPrice === null ? '—' : `$${product.unitPrice.toFixed(2)}`}
          mono
        />
        <Field label="기종" value={product.deviceModel ?? '—'} />
        <Field label="색상" value={product.color ?? '—'} />
        <Field label="모델명 (KO)" value={product.modelNameKo ?? '—'} />
        <Field label="자재내역 (EN)" value={product.productNameEnShort ?? '—'} mono />
        <Field label="EAN 바코드" value={product.eanBarcode ?? '—'} mono />
        <Field label="원산지" value={product.originCountry ?? '—'} />
        <Field label="카테고리" value={product.category ?? '—'} />
        <Field label="Lifecycle" value={product.lifecycleStatus} />
      </dl>
    </Card>
  );
}

export function Operations({ product }: { product: Product }) {
  return (
    <Card title="운영 (Operations)" right="L/T · Inbox/Outbox · 등급">
      <dl className="grid grid-cols-4 gap-x-6 gap-y-4 p-5">
        <Field
          label="L/T (리드타임)"
          value={product.leadTimeDays === null ? '—' : `${product.leadTimeDays}일`}
        />
        <Field label="INBOX 수량" value={product.inboxQty?.toString() ?? '—'} mono />
        <Field label="OUTBOX 수량" value={product.outboxQty?.toString() ?? '—'} mono />
        <Field label="배치생성일" value={product.batchCreatedAt ?? '—'} />
        <Field label="품목상태" value={product.itemGrade ?? '—'} />
        <Field label="재고등급" value={product.inventoryGrade ?? '—'} />
        <Field label="MRP 관리자" value={product.mrpManager ?? '—'} />
        <Field label="담당부서" value={product.department ?? '—'} />
      </dl>
    </Card>
  );
}

export function Dimensions({ product }: { product: Product }) {
  const hasRaw = product.rawDimWidth || product.rawDimHeight || product.rawDimDepth;
  if (!hasRaw && !product.packageDim) return null;

  return (
    <Card title="치수 (Dimensions)" right="mm">
      <div className="p-5 grid grid-cols-2 gap-6">
        <div>
          <dt className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wide">
            원자재 Dim (가로 × 세로 × 높이)
          </dt>
          <dd className="mono text-lg mt-1">
            {hasRaw
              ? `${product.rawDimWidth ?? '?'} × ${product.rawDimHeight ?? '?'} × ${product.rawDimDepth ?? '?'}`
              : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wide">
            Package Dim
          </dt>
          <dd className="mono text-lg mt-1">{product.packageDim ?? '—'}</dd>
          <p className="mt-2 text-xs text-[var(--text-tertiary)]">
            외장 박스 포장 규격. OMS 배송 산정에 사용.
          </p>
        </div>
      </div>
    </Card>
  );
}

export function LatestChange({ product }: { product: Product }) {
  if (!product.changeReason && !product.changeDetail) return null;
  return (
    <Card title={`최근 변경 (${product.version})`}>
      <div className="p-5 space-y-3 text-sm">
        {product.changeReason && (
          <div className="badge-warning rounded-lg p-4">
            <p className="text-xs uppercase tracking-wide font-medium">변경사유</p>
            <p className="mt-1 font-medium">{product.changeReason}</p>
          </div>
        )}
        {product.changeDetail && (
          <div
            className="rounded-lg p-4"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-primary)',
            }}
          >
            <p className="text-xs uppercase tracking-wide text-[var(--text-tertiary)] font-medium">
              변경내용
            </p>
            <p className="mt-1">{product.changeDetail}</p>
          </div>
        )}
      </div>
    </Card>
  );
}

export function MappingSummary({ mappings }: { mappings: MappingLite[] }) {
  return (
    <Card title={`ASIN 매핑 (${mappings.length})`}>
      <div className="p-5 space-y-3 text-sm">
        {mappings.length === 0 && (
          <p className="text-xs text-[var(--text-tertiary)]">아직 매핑이 없습니다.</p>
        )}
        {mappings.slice(0, 10).map((m) => (
          <div key={m.id} className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              {m.isPrimary && (
                <span className="badge-primary inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold">
                  PRI
                </span>
              )}
              <span className="mono">{m.asin}</span>
            </div>
            <span className="text-xs text-[var(--text-tertiary)]">{m.marketplace}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function MetaBox({ product }: { product: Product }) {
  return (
    <Card title="메타">
      <dl className="p-5 grid grid-cols-1 gap-3 text-sm">
        <Field
          label="생성"
          value={product.createdAt.slice(0, 19).replace('T', ' ')}
          mono
        />
        <Field
          label="최종 수정"
          value={product.updatedAt.slice(0, 19).replace('T', ' ')}
          mono
        />
        <Field label="org_unit_id" value={`${product.orgUnitId.slice(0, 8)}...`} mono />
      </dl>
    </Card>
  );
}

function Card({
  title,
  right,
  children,
}: {
  title: string;
  right?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--surface-card)]">
      <div className="border-b border-[var(--border-primary)] px-5 py-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        {right && <span className="text-[11px] text-[var(--text-muted)]">{right}</span>}
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wide">{label}</dt>
      <dd className={`text-sm mt-0.5 ${mono ? 'mono text-[13px]' : ''}`}>{value}</dd>
    </div>
  );
}
