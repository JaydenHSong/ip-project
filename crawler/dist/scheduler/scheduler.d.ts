import type { Queue } from 'bullmq';
import type { CrawlJobData } from '../types/index.js';
import type { SentinelClient } from '../api/sentinel-client.js';
declare const syncCampaigns: (queue: Queue<CrawlJobData>, sentinelClient: SentinelClient) => Promise<void>;
declare const startScheduler: (queue: Queue<CrawlJobData>, sentinelClient: SentinelClient) => Promise<NodeJS.Timeout>;
export { startScheduler, syncCampaigns };
//# sourceMappingURL=scheduler.d.ts.map