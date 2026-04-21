// Design Ref: products-sync.design.md §7.2 — /products/unmapped page (RSC)
// Plan SC: FR-09 list + filter + paginate

import Link from 'next/link';
import { listUnmapped } from '@/modules/products/features/sync/queries';
import { UnmappedTable } from '@/modules/products/features/sync/features/unmapped-queue/unmapped-table';
import { UnmappedFilters } from '@/modules/products/features/sync/features/unmapped-queue/unmapped-filters';
import { UnmappedEmptyState } from '@/modules/products/features/sync/features/unmapped-queue/empty-state';

type RouteParams = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function pickString(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

type ChannelFilter = 'amazon' | 'shopify' | 'ebay' | 'ml';
type ReasonFilter = 'no_ean_no_prefix' | 'prefix_ambiguous' | 'invalid_sku_format' | 'schema_drift' | 'manual_flag';
type StatusFilter = 'pending' | 'resolved' | 'ignored';

const CHANNEL_SET = new Set(['amazon', 'shopify', 'ebay', 'ml']);
const REASON_SET = new Set(['no_ean_no_prefix', 'prefix_ambiguous', 'invalid_sku_format', 'schema_drift', 'manual_flag']);
const STATUS_SET = new Set(['pending', 'resolved', 'ignored']);

export default async function UnmappedPage({ searchParams }: RouteParams) {
  const sp = await searchParams;
  const channelRaw = pickString(sp.channel);
  const reasonRaw = pickString(sp.reason);
  const statusRaw = pickString(sp.status);

  const channel: ChannelFilter | undefined = channelRaw && CHANNEL_SET.has(channelRaw) ? channelRaw as ChannelFilter : undefined;
  const reason: ReasonFilter | undefined = reasonRaw && REASON_SET.has(reasonRaw) ? reasonRaw as ReasonFilter : undefined;
  const status: StatusFilter = statusRaw && STATUS_SET.has(statusRaw) ? statusRaw as StatusFilter : 'pending';

  const page = Math.max(1, Number(pickString(sp.page) ?? '1'));

  const result = await listUnmapped({
    channel,
    marketplace: pickString(sp.marketplace),
    reason,
    status,
    page,
    limit: 50,
  });

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] px-8 py-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Unmapped Listings</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            자동 매칭에 실패한 채널 리스팅. SKU를 수동 선택하면 `channel_mapping`에 추가됩니다.
            {result.lastSyncedAt && (
              <> 마지막 sync: <time dateTime={result.lastSyncedAt}>{new Date(result.lastSyncedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</time></>
            )}
          </p>
        </div>
        <Link
          href="/products"
          className="rounded-md border border-[var(--border-primary)] bg-[var(--surface-card)] px-3 py-1.5 text-sm hover:bg-[var(--bg-hover)]"
        >
          ← Catalog
        </Link>
      </div>

      <div className="mt-4">
        <UnmappedFilters />
      </div>

      <div className="mt-2 text-xs text-[var(--text-muted)]">
        Showing {result.data.length} of {result.pagination.total} · {status} · page {page}/{result.pagination.totalPages}
      </div>

      <div className="mt-3 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-card)]">
        {result.data.length === 0 ? (
          <UnmappedEmptyState />
        ) : (
          <UnmappedTable rows={result.data} />
        )}
      </div>

      <Pagination
        page={page}
        totalPages={result.pagination.totalPages}
        baseParams={sp}
      />
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  baseParams,
}: {
  page: number;
  totalPages: number;
  baseParams: Record<string, string | string[] | undefined>;
}) {
  if (totalPages <= 1) return null;
  const build = (p: number) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(baseParams)) {
      if (Array.isArray(v)) v.forEach((vv) => next.append(k, vv));
      else if (v) next.set(k, v);
    }
    next.set('page', String(p));
    return `?${next.toString()}`;
  };
  return (
    <div className="mt-4 flex items-center justify-center gap-2 text-sm">
      {page > 1 && (
        <Link href={build(page - 1)} className="rounded-md border border-[var(--border-primary)] px-2 py-1 hover:bg-[var(--bg-hover)]">← Prev</Link>
      )}
      <span className="text-[var(--text-muted)]">Page {page} of {totalPages}</span>
      {page < totalPages && (
        <Link href={build(page + 1)} className="rounded-md border border-[var(--border-primary)] px-2 py-1 hover:bg-[var(--bg-hover)]">Next →</Link>
      )}
    </div>
  );
}
