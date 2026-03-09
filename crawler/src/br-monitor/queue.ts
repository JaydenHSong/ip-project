// BR Monitor Queue — 30분 cron, 동시성 1
import { Queue, Worker, type Job } from 'bullmq'
import type { BrMonitorJobData } from './types.js'
import { log } from '../logger.js'

const QUEUE_NAME = 'sentinel-br-monitor'

const JOB_DEFAULT_OPTIONS = {
  attempts: 2,
  backoff: {
    type: 'exponential' as const,
    delay: 600_000, // 10min → 20min
  },
  removeOnComplete: { count: 50 },
  removeOnFail: { count: 50 },
}

const createBrMonitorQueue = (redisUrl: string): Queue => {
  const queue = new Queue(QUEUE_NAME, {
    connection: { url: redisUrl },
    defaultJobOptions: JOB_DEFAULT_OPTIONS,
  })

  log('info', 'br-monitor-queue', 'BR monitor queue created')
  return queue
}

const createBrMonitorWorker = (
  redisUrl: string,
  processor: (job: Job<BrMonitorJobData>) => Promise<void>,
): Worker => {
  const worker = new Worker(
    QUEUE_NAME,
    processor,
    {
      connection: { url: redisUrl },
      concurrency: 1, // 모니터 브라우저 하나만 사용
    },
  )

  worker.on('completed', (job) => {
    log('info', 'br-monitor-queue', `BR monitor completed: ${job.id}`)
  })

  worker.on('failed', (job, error) => {
    log('error', 'br-monitor-queue', `BR monitor failed: ${job?.id} — ${error.message}`)
  })

  worker.on('error', (error) => {
    log('error', 'br-monitor-queue', `BR monitor worker error: ${error.message}`)
  })

  log('info', 'br-monitor-queue', 'BR monitor worker created (concurrency: 1)')
  return worker
}

export { createBrMonitorQueue, createBrMonitorWorker, QUEUE_NAME }
