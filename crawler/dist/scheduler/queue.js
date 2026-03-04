import { Queue, Worker } from 'bullmq';
import { log } from '../logger.js';
const QUEUE_NAME = 'sentinel-crawl';
// BullMQ 잡 레벨 재시도 옵션
const JOB_DEFAULT_OPTIONS = {
    attempts: 3,
    backoff: {
        type: 'exponential',
        delay: 60_000, // 1분 → 2분 → 4분
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
};
// 큐 생성 (Redis URL 문자열 사용하여 ioredis 버전 충돌 방지)
const createCrawlQueue = (redisUrl) => {
    const queue = new Queue(QUEUE_NAME, {
        connection: { url: redisUrl },
        defaultJobOptions: JOB_DEFAULT_OPTIONS,
    });
    log('info', 'queue', 'Crawl queue created');
    return queue;
};
// 워커 생성 (잡 프로세서)
const createCrawlWorker = (redisUrl, processor, concurrency) => {
    const worker = new Worker(QUEUE_NAME, processor, {
        connection: { url: redisUrl },
        concurrency,
    });
    // 워커 이벤트 핸들링
    worker.on('completed', (job) => {
        const result = job.returnvalue;
        log('info', 'queue', `Job completed: ${job.id} — campaign: ${job.data.campaignId}`, {
            campaignId: job.data.campaignId,
            duration: result.duration,
        });
    });
    worker.on('failed', (job, error) => {
        log('error', 'queue', `Job failed: ${job?.id} — ${error.message}`, {
            campaignId: job?.data.campaignId,
            error: error.message,
        });
    });
    worker.on('stalled', (jobId) => {
        log('warn', 'queue', `Job stalled: ${jobId}`);
    });
    worker.on('error', (error) => {
        log('error', 'queue', `Worker error: ${error.message}`, {
            error: error.message,
        });
    });
    log('info', 'queue', `Crawl worker created (concurrency: ${concurrency})`);
    return worker;
};
export { createCrawlQueue, createCrawlWorker, QUEUE_NAME };
//# sourceMappingURL=queue.js.map