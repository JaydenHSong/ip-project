import type { Job } from 'bullmq';
import type { CrawlJobData, CrawlResult } from '../types/index.js';
import type { CrawlerConfig } from '../config.js';
import type { SentinelClient } from '../api/sentinel-client.js';
import type { ProxyManager } from '../anti-bot/proxy.js';
import type { ChatNotifier } from '../notifications/google-chat.js';
declare const createJobProcessor: (config: CrawlerConfig, sentinelClient: SentinelClient, proxyManager: ProxyManager, chatNotifier: ChatNotifier) => (job: Job<CrawlJobData>) => Promise<CrawlResult>;
export { createJobProcessor };
//# sourceMappingURL=jobs.d.ts.map