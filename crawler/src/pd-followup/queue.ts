import { Queue, Worker, type Job } from 'bullmq'
import type { PdFollowupJobData } from './types.js'
import { log } from '../logger.js'

const QUEUE_NAME = 'sentinel-pd-followup'

const JOB_DEFAULT_OPTIONS = {
  attempts: 2,
  backoff: {
    type: 'exponential' as const,
    delay: 120_000, // 2분 → 4분
  },
  removeOnComplete: { count: 50 },
  removeOnFail: { count: 30 },
}

const createPdFollowupQueue = (redisUrl: string): Queue<PdFollowupJobData> => {
  const queue = new Queue<PdFollowupJobData>(QUEUE_NAME, {
    connection: { url: redisUrl },
    defaultJobOptions: JOB_DEFAULT_OPTIONS,
  })

  log('info', 'pd-followup-queue', 'PD follow-up queue created')
  return queue
}

const createPdFollowupWorker = (
  redisUrl: string,
  processor: (job: Job<PdFollowupJobData>) => Promise<void>,
): Worker<PdFollowupJobData> => {
  const worker = new Worker<PdFollowupJobData>(
    QUEUE_NAME,
    processor,
    {
      connection: { url: redisUrl },
      concurrency: 1, // PD 페이지 순차 방문 (anti-bot)
    },
  )

  worker.on('completed', (job) => {
    log('info', 'pd-followup-queue', `Job completed: ${job.id}`)
  })

  worker.on('failed', (job, error) => {
    log('error', 'pd-followup-queue', `Job failed: ${job?.id} — ${error.message}`)
  })

  worker.on('error', (error) => {
    log('error', 'pd-followup-queue', `Worker error: ${error.message}`)
  })

  log('info', 'pd-followup-queue', 'PD follow-up worker created')
  return worker
}

export { createPdFollowupQueue, createPdFollowupWorker, QUEUE_NAME }
