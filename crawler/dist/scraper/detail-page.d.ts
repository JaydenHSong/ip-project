import type { Page } from 'playwright';
import type { Marketplace, ListingDetail } from '../types/index.js';
declare const buildDetailUrl: (marketplace: Marketplace, asin: string) => string;
declare const scrapeDetailPage: (page: Page, marketplace: Marketplace, asin: string) => Promise<ListingDetail>;
export { scrapeDetailPage, buildDetailUrl };
//# sourceMappingURL=detail-page.d.ts.map