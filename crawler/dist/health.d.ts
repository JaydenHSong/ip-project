import { type Server } from 'node:http';
import type { Queue } from 'bullmq';
import type { CrawlJobData } from './types/index.js';
type HealthStatus = {
    status: 'ok' | 'degraded' | 'error';
    uptime: number;
    redis: boolean;
    worker: boolean;
    timestamp: string;
};
type HealthCheckFn = () => HealthStatus;
type HealthServerOptions = {
    port: number;
    getStatus: HealthCheckFn;
    queue?: Queue<CrawlJobData>;
    serviceToken?: string;
};
declare const createHealthServer: (options: HealthServerOptions) => Server;
export { createHealthServer };
export type { HealthStatus, HealthCheckFn };
//# sourceMappingURL=health.d.ts.map