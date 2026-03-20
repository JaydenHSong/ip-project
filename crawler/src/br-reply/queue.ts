// BR Reply Queue — 요청 시 실행, 동시성 1
import { Queue, Worker, type Job } from 'bullmq'
import type { BrReplyJobData } from './types.js'
import { log } from '../logger.js'

const QUEUE_NAME = 'sentinel-br-reply'

const JOB_DEFAULT_OPTIONS = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 300_000, // 5min → 10min → 20min
  },
  removeOnComplete: { count: 50 },
  removeOnFail: { count: 50 },
}

const createBrReplyQueue = (redisUrl: string): Queue => {
  const queue = new Queue(QUEUE_NAME, {
    connection: { url: redisUrl },
    defaultJobOptions: JOB_DEFAULT_OPTIONS,
  })

  log('info', 'br-reply-queue', 'BR reply queue created')
  return queue
}

const createBrReplyWorker = (
  redisUrl: string,
  processor: (job: Job<BrReplyJobData>) => Promise<void>,
): Worker => {
  const worker = new Worker(
    QUEUE_NAME,
    processor,
    {
      connection: { url: redisUrl },
      concurrency: 1, // Browser 3 공유 — 동시성 1
    },
  )

  worker.on('completed', (job) => {
    log('info', 'br-reply-queue', `BR reply completed: ${job.id}`)
  })

  worker.on('failed', (job, error) => {
    log('error', 'br-reply-queue', `BR reply failed: ${job?.id} — ${error.message}`)
  })

  worker.on('error', (error) => {
    log('error', 'br-reply-queue', `BR reply worker error: ${error.message}`)
  })

  log('info', 'br-reply-queue', 'BR reply worker created (concurrency: 1)')
  return worker
}

export { createBrReplyQueue, createBrReplyWorker, QUEUE_NAME }
