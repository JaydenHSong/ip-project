import type { Campaign, CrawlerListingRequest, CrawlerListingResponse, CrawlerBatchResponse, CrawlerLogRequest } from '../types/index.js';
type SentinelClient = {
    getActiveCampaigns: () => Promise<Campaign[]>;
    submitListing: (data: CrawlerListingRequest) => Promise<CrawlerListingResponse>;
    submitBatch: (listings: CrawlerListingRequest[]) => Promise<CrawlerBatchResponse>;
    submitLog: (logData: CrawlerLogRequest) => Promise<void>;
};
declare const createSentinelClient: (apiUrl: string, serviceToken: string) => SentinelClient;
export { createSentinelClient };
export type { SentinelClient };
//# sourceMappingURL=sentinel-client.d.ts.map