import 'dotenv/config';
type CrawlerConfig = {
    sentinelApiUrl: string;
    serviceToken: string;
    redis: {
        url: string;
    };
    proxy: {
        host: string;
        port: number;
        username: string;
        password: string;
    };
    concurrency: number;
    pageDelayMin: number;
    pageDelayMax: number;
    detailDelayMin: number;
    detailDelayMax: number;
    maxRetries: number;
    screenshotWidth: number;
    screenshotHeight: number;
    googleChatWebhookUrl: string | null;
};
declare const loadConfig: () => CrawlerConfig;
export { loadConfig };
export type { CrawlerConfig };
//# sourceMappingURL=config.d.ts.map