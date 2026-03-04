import type { Page } from 'playwright';
import type { Marketplace, SearchResult } from '../types/index.js';
declare const buildSearchUrl: (marketplace: Marketplace, keyword: string, pageNumber: number) => string;
declare const detectBlock: (page: Page) => Promise<boolean>;
declare const scrapeSearchPage: (page: Page, marketplace: Marketplace, keyword: string, pageNumber: number) => Promise<SearchResult[]>;
declare const hasNextPage: (page: Page) => Promise<boolean>;
export { scrapeSearchPage, buildSearchUrl, detectBlock, hasNextPage };
//# sourceMappingURL=search-page.d.ts.map