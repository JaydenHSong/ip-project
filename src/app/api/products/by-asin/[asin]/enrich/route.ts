// Design Ref: §3.1 POST /api/products/by-asin/[asin]/enrich + §7.1 SP-API Catalog
// Plan SC: SC-03 (Data Accuracy — enrichment improves product_name/brand)

import type { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { fetchCatalogItem } from '@/modules/products/api/adapters/amazon-catalog';
import { getByAsin } from '@/modules/products/features/mapping/queries';
import {
  getProductBySku,
  patchProductCatalogFields,
} from '@/modules/products/features/catalog/queries';
import { enrichQuerySchema } from '@/modules/products/features/mapping/validators';
import { ASIN_REGEX } from '@/modules/products/shared/constants';
import {
  ok,
  notFound,
  badRequest,
  tooManyRequests,
  notImplemented,
  serverError,
  handleError,
  zodError,
} from '@/modules/products/api/response';
import { resolveProductsCtx } from '@/modules/products/api/context';

const EDIT_ROLES = ['editor', 'admin', 'owner'] as const;
const ENRICH_ENABLED = process.env.PRODUCTS_AMAZON_ENRICH_ENABLED === 'true';

// POST /api/products/by-asin/[asin]/enrich?marketplace=US
// Future feature. Current production data flow reads from Supabase products tables.
export const POST = withAuth(async (req: NextRequest, { user, params }) => {
  try {
    if (!ENRICH_ENABLED) {
      return notImplemented('Amazon Catalog enrich is disabled', {
        status: 'future',
        enableWith: 'PRODUCTS_AMAZON_ENRICH_ENABLED=true',
      });
    }

    const asin = params.asin;
    if (!ASIN_REGEX.test(asin)) {
      return badRequest('invalid', {
        asin: ['ASIN은 B로 시작하는 10자리 영숫자여야 합니다'],
      });
    }

    const raw = Object.fromEntries(new URL(req.url).searchParams);
    const parsed = enrichQuerySchema.safeParse(raw);
    if (!parsed.success) return zodError(parsed.error);

    const { marketplace } = parsed.data;

    const mapping = await getByAsin(asin, marketplace);
    if (!mapping) {
      return notFound('ASIN not mapped — enrich requires an existing mapping', {
        asin,
        marketplace,
      });
    }

    const result = await fetchCatalogItem(asin, marketplace);
    if (!result.ok) {
      switch (result.reason) {
        case 'not_found':
          return notFound('Amazon Catalog did not return data', {
            asin,
            marketplace,
            detail: result.message,
          });
        case 'rate_limited':
          return tooManyRequests(result.message, 5);
        case 'auth':
          return serverError(`SP-API auth: ${result.message}`);
        case 'network':
        default:
          return serverError(`SP-API network: ${result.message}`);
      }
    }

    const product = await getProductBySku(mapping.sku);
    if (!product) {
      return notFound('Linked product row not found', { sku: mapping.sku });
    }

    const ctx = await resolveProductsCtx(user);
    await patchProductCatalogFields(product.id, {
      productName: result.data.productName || product.productName,
      updatedBy: ctx.userId,
    });

    return ok({
      enriched: {
        productName: result.data.productName,
        brand: result.data.brand,
        imageUrl: result.data.imageUrl,
      },
      source: 'sp-api/catalog-items/v2022-04-01',
      applied: true,
    });
  } catch (err) {
    return handleError(err);
  }
}, [...EDIT_ROLES]);
