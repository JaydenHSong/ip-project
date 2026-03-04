// 마켓플레이스별 도메인 매핑
const MARKETPLACE_DOMAINS = {
    US: 'www.amazon.com',
    UK: 'www.amazon.co.uk',
    JP: 'www.amazon.co.jp',
    DE: 'www.amazon.de',
    FR: 'www.amazon.fr',
    IT: 'www.amazon.it',
    ES: 'www.amazon.es',
    CA: 'www.amazon.ca',
    MX: 'www.amazon.com.mx',
    AU: 'www.amazon.com.au',
};
// 에러 유형
const CRAWL_ERROR_TYPES = {
    CAPTCHA_DETECTED: 'CAPTCHA_DETECTED',
    IP_BLOCKED: 'IP_BLOCKED',
    PAGE_NOT_FOUND: 'PAGE_NOT_FOUND',
    SELECTOR_FAILED: 'SELECTOR_FAILED',
    NETWORK_ERROR: 'NETWORK_ERROR',
    API_ERROR: 'API_ERROR',
    API_DUPLICATE: 'API_DUPLICATE',
    BROWSER_CRASH: 'BROWSER_CRASH',
};
export { MARKETPLACE_DOMAINS, CRAWL_ERROR_TYPES };
//# sourceMappingURL=index.js.map