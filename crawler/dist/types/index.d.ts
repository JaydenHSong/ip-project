declare const MARKETPLACE_DOMAINS: {
    readonly US: "www.amazon.com";
    readonly UK: "www.amazon.co.uk";
    readonly JP: "www.amazon.co.jp";
    readonly DE: "www.amazon.de";
    readonly FR: "www.amazon.fr";
    readonly IT: "www.amazon.it";
    readonly ES: "www.amazon.es";
    readonly CA: "www.amazon.ca";
    readonly MX: "www.amazon.com.mx";
    readonly AU: "www.amazon.com.au";
};
type Marketplace = keyof typeof MARKETPLACE_DOMAINS;
type SearchResult = {
    asin: string;
    title: string;
    price: string | null;
    imageUrl: string | null;
    sponsored: boolean;
    pageNumber: number;
    positionInPage: number;
};
type ListingDetail = {
    asin: string;
    title: string;
    description: string | null;
    bulletPoints: string[];
    images: {
        url: string;
        position: number;
        alt?: string;
    }[];
    priceAmount: number | null;
    priceCurrency: string;
    sellerName: string | null;
    sellerId: string | null;
    brand: string | null;
    category: string | null;
    rating: number | null;
    reviewCount: number | null;
};
type Campaign = {
    id: string;
    keyword: string;
    marketplace: string;
    frequency: string;
    max_pages: number;
    status: string;
    start_date: string;
    end_date: string | null;
};
type CrawlJobData = {
    campaignId: string;
    keyword: string;
    marketplace: string;
    maxPages: number;
};
type CrawlResult = {
    campaignId: string;
    totalFound: number;
    totalSent: number;
    duplicates: number;
    errors: number;
    duration: number;
};
type ProxyConfig = {
    host: string;
    port: number;
    username: string;
    password: string;
    protocol: 'http' | 'https';
};
type ProxyStatus = 'active' | 'blocked' | 'cooldown';
type ManagedProxy = {
    config: ProxyConfig;
    status: ProxyStatus;
    failCount: number;
    lastUsed: number;
    blockedUntil: number | null;
};
type BrowserFingerprint = {
    userAgent: string;
    viewport: {
        width: number;
        height: number;
    };
    locale: string;
    timezone: string;
    platform: string;
    webglVendor: string;
    webglRenderer: string;
};
declare const CRAWL_ERROR_TYPES: {
    readonly CAPTCHA_DETECTED: "CAPTCHA_DETECTED";
    readonly IP_BLOCKED: "IP_BLOCKED";
    readonly PAGE_NOT_FOUND: "PAGE_NOT_FOUND";
    readonly SELECTOR_FAILED: "SELECTOR_FAILED";
    readonly NETWORK_ERROR: "NETWORK_ERROR";
    readonly API_ERROR: "API_ERROR";
    readonly API_DUPLICATE: "API_DUPLICATE";
    readonly BROWSER_CRASH: "BROWSER_CRASH";
};
type CrawlErrorType = (typeof CRAWL_ERROR_TYPES)[keyof typeof CRAWL_ERROR_TYPES];
type CrawlerListingRequest = {
    asin: string;
    marketplace: string;
    title: string;
    description?: string;
    bullet_points?: string[];
    images?: {
        url: string;
        position: number;
    }[];
    price_amount?: number;
    price_currency?: string;
    seller_name?: string;
    seller_id?: string;
    brand?: string;
    category?: string;
    rating?: number;
    review_count?: number;
    source_campaign_id: string;
    screenshot_base64?: string;
};
type CrawlerListingResponse = {
    id: string;
    asin: string;
    is_suspect: boolean;
    suspect_reasons: string[];
    created_at: string;
};
type CrawlerBatchResponse = {
    created: number;
    duplicates: number;
    errors: {
        asin: string;
        error: string;
    }[];
};
type CrawlerLogRequest = {
    type: 'crawl_complete' | 'crawl_error' | 'proxy_ban' | 'captcha' | 'rate_limit' | 'api_error';
    campaign_id?: string;
    keyword?: string;
    marketplace?: string;
    pages_crawled?: number;
    listings_found?: number;
    listings_sent?: number;
    new_listings?: number;
    duplicates?: number;
    errors?: number;
    captchas?: number;
    proxy_rotations?: number;
    duration_ms?: number;
    message?: string;
    asin?: string;
    error_code?: string;
};
type LogEntry = {
    timestamp: string;
    level: 'info' | 'warn' | 'error';
    module: string;
    campaignId?: string;
    asin?: string;
    message: string;
    error?: string;
    duration?: number;
};
type ChatNotification = {
    type: 'crawl_complete' | 'crawl_failed' | 'listing_submitted' | 'action_required';
    title: string;
    details: string;
};
export { MARKETPLACE_DOMAINS, CRAWL_ERROR_TYPES };
export type { Marketplace, SearchResult, ListingDetail, Campaign, CrawlJobData, CrawlResult, ProxyConfig, ProxyStatus, ManagedProxy, BrowserFingerprint, CrawlErrorType, CrawlerListingRequest, CrawlerListingResponse, CrawlerBatchResponse, CrawlerLogRequest, LogEntry, ChatNotification, };
//# sourceMappingURL=index.d.ts.map