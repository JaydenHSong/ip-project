import { Queue, Worker, type Job } from 'bullmq'
import type { PdSubmitJobData, PdSubmitResult } from './types.js'
import { log } from '../logger.js'

const QUEUE_NAME = 'sentinel-pd-submit'

const JOB_DEFAULT_OPTIONS = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 300_000, // 5min → 10min → 20min
  },
  removeOnComplete: { count: 50 },
  removeOnFail: { count: 50 },
}

const createPdSubmitQueue = (redisUrl: string): Queue => {
  const queue = new Queue(QUEUE_NAME, {
    connection: { url: redisUrl },
    defaultJobOptions: JOB_DEFAULT_OPTIONS,
  })

  log('info', 'sc-queue', 'PD submit queue created')
  return queue
}

const createPdSubmitWorker = (
  redisUrl: string,
  processor: (job: Job<PdSubmitJobData>) => Promise<PdSubmitResult>,
): Worker => {
  const worker = new Worker(
    QUEUE_NAME,
    processor,
    {
      connection: { url: redisUrl },
      concurrency: 1, // SC 계정 병렬 접속 → Amazon 차단 위험
      limiter: {
        max: 10,
        duration: 3_600_000, // 10 per hour
      },
    },
  )

  worker.on('completed', (job) => {
    const result = job.returnvalue
    log('info', 'sc-queue', `PD submit completed: ${job.id} — report: ${result.reportId}, success: ${result.success}`)
  })

  worker.on('failed', (job, error) => {
    log('error', 'sc-queue', `PD submit failed: ${job?.id} — ${error.message}`)
  })

  worker.on('error', (error) => {
    log('error', 'sc-queue', `SC worker error: ${error.message}`)
  })

  log('info', 'sc-queue', 'PD submit worker created (concurrency: 1)')
  return worker
}

export { createPdSubmitQueue, createPdSubmitWorker, QUEUE_NAME }
