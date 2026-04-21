// Design Ref: §4.1 /products/mapping page (Server Component)
// Plan SC: SC-01 (grid + filters), SC-07 (Provider v1 reads via listMapping)

import Link from 'next/link';
import { listMapping, getMappingRowById } from '@/modules/products/features/mapping/queries';
import { MappingTable } from '@/modules/products/features/mapping/components/mapping-table';
import { MarketplaceFilter } from '@/modules/products/features/mapping/components/marketplace-filter';
import { MappingPageShell } from '@/modules/products/features/mapping/components/mapping-page-shell';
import type { Marketplace } from '@/modules/products/shared/types';
import { MARKETPLACES } from '@/modules/products/shared/constants';

type SearchParams = {
  marketplace?: string;
  search?: string;
  primaryOnly?: string;
  page?: string;
  limit?: string;
  edit?: string;
};

type Props = {
  searchParams: Promise<SearchParams>;
};

const DEFAULT_LIMIT = 50;

export default async function MappingPage({ searchParams }: Props) {
  const params = await searchParams;

  const marketplace = toMarketplace(params.marketplace);
  const page = toInt(params.page, 1);
  const limit = toInt(params.limit, DEFAULT_LIMIT);
  const primaryOnly = params.primaryOnly === 'true';
  const search = params.search?.trim() || undefined;

  const result = await listMapping({
    marketplace,
    search,
    primaryOnly,
    page,
    limit,
  });

  // Fetch the row (with joined catalog fields) to auto-open EditSlidePanel
  const editRow = params.edit
    ? await getMappingRowById(params.edit).catch(() => null)
    : null;

  return (
    <div>
      <Header total={result.pagination.total} />
      <div className="border-b border-[var(--border-primary)] bg-[var(--surface-card)] px-8">
        <MarketplaceFilter current={marketplace} counts={{ all: result.pagination.total }} />
      </div>

      {/* C1 fix: mount Import CSV / Quick Add / Edit SlidePanel entry points */}
      <MappingPageShell editRow={editRow} />

      <FilterBar params={params} />

      <div className="px-8 py-6">
        <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--surface-card)] overflow-hidden">
          <MappingTable rows={result.data} onEditHref={(r) => `/products/mapping?edit=${r.id}`} />
          <Pagination
            page={result.pagination.page}
            limit={result.pagination.limit}
            total={result.pagination.total}
            params={params}
          />
        </div>

        <ProviderApiHint />
      </div>
    </div>
  );
}

function Header({ total }: { total: number }) {
  return (
    <div className="border-b border-[var(--border-primary)] bg-[var(--surface-card)] px-8 py-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <nav className="text-xs text-[var(--text-tertiary)] flex items-center gap-1.5">
            <span>Product Library</span>
            <span>›</span>
            <span className="text-[var(--text-primary)] font-medium">ASIN Mapping</span>
          </nav>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">ASIN × Marketplace Mapping</h1>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">
            Provider v1 · {total.toLocaleString()} mappings across {MARKETPLACES.length} marketplaces
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/products"
            className="rounded-lg border border-[var(--border-primary)] bg-[var(--surface-card)] px-3 py-1.5 text-sm hover:bg-[var(--bg-hover)]"
          >
            ← Catalog
          </Link>
        </div>
      </div>
    </div>
  );
}

function FilterBar({ params }: { params: SearchParams }) {
  return (
    <form
      method="get"
      className="border-b border-[var(--border-primary)] bg-[var(--surface-card)] px-8 py-3 flex flex-wrap items-center gap-2"
    >
      {/* keep existing searchParams when submitting */}
      {params.marketplace && <input type="hidden" name="marketplace" value={params.marketplace} />}
      <div className="relative">
        <input
          name="search"
          defaultValue={params.search ?? ''}
          placeholder="SKU · ASIN · 자재내역 검색..."
          className="w-80 rounded-lg border border-[var(--border-primary)] bg-[var(--surface-card)] px-3 py-1.5 pl-8 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
        />
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm">
          ⌕
        </span>
      </div>
      <label className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
        <input
          type="checkbox"
          name="primaryOnly"
          value="true"
          defaultChecked={params.primaryOnly === 'true'}
        />
        Primary만
      </label>
      <button
        type="submit"
        className="rounded-lg bg-[var(--accent)] text-white px-3 py-1.5 text-sm hover:bg-[var(--accent-hover)]"
      >
        적용
      </button>
    </form>
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
        {total === 0 ? 0 : `${from} – ${to}`} of {total.toLocaleString()} mappings
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

function ProviderApiHint() {
  return (
    <div className="mt-6 rounded-xl p-5 text-sm border border-[var(--violet-text)]"
         style={{ background: 'var(--violet-bg)' }}>
      <p className="font-medium" style={{ color: 'var(--violet-text)' }}>
        🔗 Provider API v1 (다른 모듈용 · 변경 금지)
      </p>
      <pre
        className="mt-3 rounded-lg p-3 mono text-[12px] overflow-x-auto border border-[var(--border-primary)]"
        style={{ background: 'var(--surface-card)', color: 'var(--text-secondary)' }}
      >
{`GET /api/products/by-asin/B0EXAMPLE1?marketplace=US
→ 200 { sku, productName, brand, category, marketplace, isPrimary, status }
→ 404 { error: "ASIN not mapped", asin, marketplace }`}
      </pre>
    </div>
  );
}

function toInt(v: string | undefined, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 1 ? n : fallback;
}

function toMarketplace(v: string | undefined): Marketplace | undefined {
  if (!v) return undefined;
  return (MARKETPLACES as readonly string[]).includes(v) ? (v as Marketplace) : undefined;
}
