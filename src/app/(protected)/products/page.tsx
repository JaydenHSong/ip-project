// Design Ref: §4.1 src/app/(protected)/products/page.tsx — Catalog list (Server Component)
// Plan SC: SC-03 (Spigen 자재 리스팅 포맷 기반 UI)

import Link from 'next/link';
import { listProducts } from '@/modules/products/features/catalog/queries';
import { CatalogTable } from '@/modules/products/features/catalog/components/catalog-table';
import { readLatestStageSummaries } from '@/modules/products/features/sync/queries';
import { SyncStatusBadges } from '@/modules/products/features/sync/features/sync-badge/sync-status-badges';
import { SyncNowButton } from '@/modules/products/features/sync/features/sync-badge/sync-now-button';
import type { LifecycleStatus } from '@/modules/products/shared/types';

type SearchParams = {
  search?: string;
  deviceModel?: string;
  brandId?: string;
  lifecycleStatus?: string;
  page?: string;
  limit?: string;
};

type Props = {
  searchParams: Promise<SearchParams>;
};

const DEFAULT_LIMIT = 50;

export default async function CatalogPage({ searchParams }: Props) {
  const params = await searchParams;

  const page = toInt(params.page, 1);
  const limit = toInt(params.limit, DEFAULT_LIMIT);

  const result = await listProducts({
    search: params.search,
    deviceModel: params.deviceModel,
    brandId: params.brandId,
    lifecycleStatus: toLifecycle(params.lifecycleStatus),
    page,
    limit,
    latestVersionOnly: true,
  });

  return (
    <div>
      <Header total={result.pagination.total} syncSummaries={await readLatestStageSummaries()} />
      <div className="px-8 py-6">
        <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--surface-card)] overflow-hidden">
          <CatalogTable rows={result.data} />
          <Pagination
            page={result.pagination.page}
            limit={result.pagination.limit}
            total={result.pagination.total}
            params={params}
          />
        </div>
        <p className="mt-3 text-xs text-[var(--text-tertiary)]">
          💡 행 클릭 → 제품 상세 페이지. ⋯ → ASIN 매핑 / Edit / Archive.
        </p>
      </div>
    </div>
  );
}

type SyncSummaries = Awaited<ReturnType<typeof readLatestStageSummaries>>;

function Header({ total, syncSummaries }: { total: number; syncSummaries: SyncSummaries }) {
  return (
    <div className="border-b border-[var(--border-primary)] bg-[var(--surface-card)] px-8 py-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <nav className="text-xs text-[var(--text-tertiary)] flex items-center gap-1.5">
            <span>Product Library</span>
            <span>›</span>
            <span className="text-[var(--text-primary)] font-medium">Catalog</span>
          </nav>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Product Catalog</h1>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">
            {total.toLocaleString()} SKUs · 자재 리스팅 (최신 배치)
          </p>
          <div className="mt-3">
            <SyncStatusBadges initial={syncSummaries} />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <SyncNowButton />
          <Link
            href="/products/unmapped"
            className="rounded-lg border border-[var(--border-primary)] bg-[var(--surface-card)] px-3 py-1.5 text-sm hover:bg-[var(--bg-hover)]"
          >
            Unmapped Queue →
          </Link>
          <a
            href="/csv-template/products.csv"
            download="products-template.csv"
            aria-label="ASIN 매핑 CSV 템플릿 다운로드"
            className="rounded-lg border border-[var(--border-primary)] bg-[var(--surface-card)] px-3 py-1.5 text-sm hover:bg-[var(--bg-hover)]"
          >
            CSV 템플릿 ↓
          </a>
          <Link
            href="/products/mapping"
            className="rounded-lg border border-[var(--border-primary)] bg-[var(--surface-card)] px-3 py-1.5 text-sm hover:bg-[var(--bg-hover)]"
          >
            ASIN 매핑 →
          </Link>
        </div>
      </div>
    </div>
  );
}

function Pagination({
  page,
  limit,
  total,
  params,
}: {
  page: number;
  limit: number;
  total: number;
  params: SearchParams;
}) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const from = (page - 1) * limit + 1;
  const to = Math.min(total, page * limit);

  const hrefFor = (targetPage: number): string => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) sp.set(k, v);
    }
    sp.set('page', String(targetPage));
    return `?${sp.toString()}`;
  };

  return (
    <div className="flex items-center justify-between border-t border-[var(--border-primary)] px-4 py-2.5 text-xs text-[var(--text-tertiary)]">
      <p>
        {total === 0 ? 0 : `${from} – ${to}`} of {total.toLocaleString()} SKUs
      </p>
      <div className="flex items-center gap-1">
        <PagerLink href={hrefFor(Math.max(1, page - 1))} disabled={page <= 1}>
          ‹ Prev
        </PagerLink>
        <span className="px-2">
          Page {page} / {totalPages}
        </span>
        <PagerLink href={hrefFor(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>
          Next ›
        </PagerLink>
      </div>
    </div>
  );
}

function PagerLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  const base =
    'rounded border border-[var(--border-primary)] px-2 py-1 hover:bg-[var(--bg-hover)]';
  if (disabled) {
    return <span className={`${base} opacity-50 cursor-not-allowed`}>{children}</span>;
  }
  return (
    <Link href={href} className={base}>
      {children}
    </Link>
  );
}

function toInt(v: string | undefined, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 1 ? n : fallback;
}

function toLifecycle(v: string | undefined): LifecycleStatus | undefined {
  if (v === 'active' || v === 'new' || v === 'eol' || v === 'discontinued') return v;
  return undefined;
}
