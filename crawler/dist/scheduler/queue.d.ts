import { Queue, Worker, type Job } from 'bullmq';
import type { CrawlJobData, CrawlResult } from '../types/index.js';
declare const QUEUE_NAME = "sentinel-crawl";
declare const createCrawlQueue: (redisUrl: string) => Queue<CrawlJobData>;
declare const createCrawlWorker: (redisUrl: string, processor: (job: Job<CrawlJobData>) => Promise<CrawlResult>, concurrency: number) => Worker<CrawlJobData, CrawlResult>;
export { createCrawlQueue, createCrawlWorker, QUEUE_NAME };
//# sourceMappingURL=queue.d.ts.map