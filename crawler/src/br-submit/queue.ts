import { Queue, Worker, type Job } from 'bullmq'
import type { BrSubmitJobData, BrSubmitResult } from './types.js'
import { log } from '../logger.js'

const QUEUE_NAME = 'sentinel-br-submit'

const JOB_DEFAULT_OPTIONS = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 300_000, // 5min → 10min → 20min
  },
  removeOnComplete: { count: 50 },
  removeOnFail: { count: 50 },
}

const createBrSubmitQueue = (redisUrl: string): Queue => {
  const queue = new Queue(QUEUE_NAME, {
    connection: { url: redisUrl },
    defaultJobOptions: JOB_DEFAULT_OPTIONS,
  })

  log('info', 'br-queue', 'BR submit queue created')
  return queue
}

const createBrSubmitWorker = (
  redisUrl: string,
  processor: (job: Job<BrSubmitJobData>) => Promise<BrSubmitResult>,
): Worker => {
  const worker = new Worker(
    QUEUE_NAME,
    processor,
    {
      connection: { url: redisUrl },
      concurrency: 1, // BR 세션 하나만 사용
      limiter: {
        max: 2,
        duration: 60_000, // 2 per minute (넉넉하게, ~30 per 15min)
      },
    },
  )

  worker.on('completed', (job) => {
    const result = job.returnvalue
    log('info', 'br-queue', `BR submit completed: ${job.id} — report: ${result.reportId}, success: ${result.success}`)
  })

  worker.on('failed', (job, error) => {
    log('error', 'br-queue', `BR submit failed: ${job?.id} — ${error.message}`)
  })

  worker.on('error', (error) => {
    log('error', 'br-queue', `BR worker error: ${error.message}`)
  })

  log('info', 'br-queue', 'BR submit worker created (concurrency: 1)')
  return worker
}

export { createBrSubmitQueue, createBrSubmitWorker, QUEUE_NAME }
