// Design Ref: §5.1 Product Detail page
// Plan SC: SC-03 (Spigen 자재 리스팅 + 운영/치수/변경 이력)
//
// Server Component. Section components live in
// features/catalog/components/product-detail-sections.tsx (split for NFR-06).

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProductBySku } from '@/modules/products/features/catalog/queries';
import { listMapping } from '@/modules/products/features/mapping/queries';
import {
  BasicInfo,
  Operations,
  Dimensions,
  LatestChange,
  MappingSummary,
  MetaBox,
} from '@/modules/products/features/catalog/components/product-detail-sections';
import type { Product } from '@/modules/products/shared/types';

type RouteParams = {
  params: Promise<{ sku: string }>;
  searchParams: Promise<{ version?: string }>;
};

export default async function ProductDetailPage({ params, searchParams }: RouteParams) {
  const [{ sku }, { version }] = await Promise.all([params, searchParams]);
  const decoded = decodeURIComponent(sku);

  const product = await getProductBySku(decoded, version);
  if (!product) notFound();

  const mappings = await listMapping({
    search: decoded,
    limit: 50,
    page: 1,
    primaryOnly: false,
  });

  return (
    <div>
      <DetailHeader product={product} />
      <div className="px-8 py-6 grid grid-cols-3 gap-6">
        <section className="col-span-2 space-y-6">
          <BasicInfo product={product} />
          <Operations product={product} />
          <Dimensions product={product} />
          <LatestChange product={product} />
        </section>

        <aside className="space-y-6">
          <MappingSummary mappings={mappings.data} />
          <MetaBox product={product} />
        </aside>
      </div>
    </div>
  );
}

function DetailHeader({ product }: { product: Product }) {
  return (
    <div className="border-b border-[var(--border-primary)] bg-[var(--surface-card)] px-8 py-5">
      <nav className="text-xs text-[var(--text-tertiary)] flex items-center gap-1.5">
        <Link href="/products" className="hover:underline">
          Catalog
        </Link>
        <span>›</span>
        <span className="mono">{product.sku}</span>
      </nav>

      <div className="flex items-start justify-between mt-2 gap-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight mono">{product.sku}</h1>
            <span className="badge-neutral inline-flex rounded px-1.5 py-0.5 text-[11px] font-medium">
              배치 {product.version}
            </span>
            <span className="badge-success inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium">
              {product.lifecycleStatus}
            </span>
          </div>
          <p className="mt-1 text-lg text-[var(--text-secondary)]">
            {product.productNameKo ?? product.productName}
          </p>
          {product.eanBarcode && (
            <p className="text-sm text-[var(--text-muted)] mono">
              EAN {product.eanBarcode}
              {product.productNameEnShort ? ` · ${product.productNameEnShort}` : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/products"
            className="rounded-lg border border-[var(--border-primary)] bg-[var(--surface-card)] px-3 py-1.5 text-sm hover:bg-[var(--bg-hover)]"
          >
            ← Back
          </Link>
          <Link
            href={`/products/mapping?search=${encodeURIComponent(product.sku)}`}
            className="rounded-lg border border-[var(--border-primary)] bg-[var(--surface-card)] px-3 py-1.5 text-sm hover:bg-[var(--bg-hover)]"
          >
            ASIN 매핑 보기 →
          </Link>
        </div>
      </div>
    </div>
  );
}
