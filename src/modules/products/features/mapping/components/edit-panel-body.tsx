'use client';

// Edit SlidePanel body sections (split from edit-slide-panel.tsx for NFR-06)

import type {
  AsinMappingRow,
  AuditEntry,
  MappingStatus,
} from '@/modules/products/shared/types';
import { AuditTimeline } from './audit-timeline';

export function AdminBadge() {
  return (
    <div
      className="border-b border-[var(--border-primary)] px-5 py-2.5 flex items-center gap-2"
      style={{ background: 'var(--violet-bg)' }}
    >
      <span
        className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold"
        style={{ background: 'var(--violet-text)', color: '#fff' }}
      >
        ADMIN
      </span>
      <p className="text-xs" style={{ color: 'var(--violet-text)' }}>
        Admin 권한으로 접근 중 · Audit log 자동 기록
      </p>
    </div>
  );
}

export function AttributesSection({
  marketplace,
  isPrimary,
  setIsPrimary,
  status,
  setStatus,
}: {
  marketplace: string;
  isPrimary: boolean;
  setIsPrimary: (v: boolean) => void;
  status: MappingStatus;
  setStatus: (v: MappingStatus) => void;
}) {
  return (
    <section className="px-5 py-5 border-b border-[var(--border-primary)]">
      <h3 className="text-xs uppercase tracking-wide text-[var(--text-tertiary)] font-medium">
        Mapping 속성
      </h3>
      <div className="mt-3 space-y-4 text-sm">
        <div className="flex items-start justify-between gap-4 rounded-lg border border-[var(--border-primary)] p-3">
          <div>
            <p className="font-medium">Primary 매핑</p>
            <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
              SKU × {marketplace} 조합의 대표 ASIN
            </p>
          </div>
          <Toggle checked={isPrimary} onChange={setIsPrimary} />
        </div>

        <div>
          <label className="text-xs font-medium text-[var(--text-secondary)]">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as MappingStatus)}
            className="mt-1 w-full rounded-lg border border-[var(--border-primary)] bg-[var(--surface-card)] px-3 py-2 text-sm"
          >
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>
    </section>
  );
}

export function CatalogSection({ row }: { row: AsinMappingRow }) {
  return (
    <section className="px-5 py-5 border-b border-[var(--border-primary)]">
      <h3 className="text-xs uppercase tracking-wide text-[var(--text-tertiary)] font-medium">
        연결된 Catalog
      </h3>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <Row label="SKU / 배치" value={`${row.sku} / ${row.version}`} mono />
        <Row label="기종" value={row.deviceModel ?? '—'} />
        <Row label="색상" value={row.color ?? '—'} />
        <Row label="모델명 (KO)" value={row.modelNameKo ?? '—'} />
        <Row label="EAN" value={row.eanBarcode ?? '—'} mono />
      </dl>
    </section>
  );
}

export function AuditSection({ entries }: { entries: AuditEntry[] }) {
  return (
    <section className="px-5 py-5">
      <div className="flex items-center justify-between">
        <h3 className="text-xs uppercase tracking-wide text-[var(--text-tertiary)] font-medium">
          최근 변경 이력 (Audit)
        </h3>
      </div>
      <AuditTimeline entries={entries} />
    </section>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative inline-flex items-center mt-1"
    >
      <span
        className="w-10 h-5 rounded-full transition-colors"
        style={{ background: checked ? 'var(--accent)' : 'var(--border-secondary)' }}
      />
      <span
        className="absolute top-0.5 size-4 bg-white rounded-full transition-transform"
        style={{ left: checked ? '22px' : '2px' }}
      />
    </button>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[11px] text-[var(--text-tertiary)]">{label}</dt>
      <dd className={`text-sm ${mono ? 'mono text-[13px]' : ''}`}>{value}</dd>
    </div>
  );
}
