// BullMQ 비동기 잡 큐 — Redis 있으면 비동기, 없으면 동기 fallback
// Gap 3: AI 분석 5~15초 소요 → API 타임아웃 방지를 위한 비동기 처리
// BullMQ는 optional dependency — 설치 안 되어도 동기 모드로 정상 동작

import type { AiAnalysisJobData, AiAnalysisJobResult } from '@/types/ai'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let bullmqModule: any = null

const BULLMQ_MODULE = 'bullmq'

const loadBullMQ = async (): Promise<unknown> => {
  if (bullmqModule) return bullmqModule
  try {
    // Dynamic import — bullmq is an optional dependency
    bullmqModule = await import(/* webpackIgnore: true */ BULLMQ_MODULE)
    return bullmqModule
  } catch {
    return null
  }
}

const QUEUE_NAME = 'sentinel-ai-analysis'

const getRedisConnection = (): { url: string } | null => {
  const url = process.env.REDIS_URL
  if (!url) return null
  return { url }
}

type AiQueue = {
  add: (name: string, data: AiAnalysisJobData, opts?: { priority?: number }) => Promise<{ id: string | undefined }>
  getJob: (id: string) => Promise<{
    id: string | undefined
    data: AiAnalysisJobData
    progress: number | object
    returnvalue: AiAnalysisJobResult | undefined
    failedReason: string | undefined
    finishedOn: number | undefined
    processedOn: number | undefined
    getState: () => Promise<string>
  } | undefined>
}

const createAiQueue = async (): Promise<AiQueue | null> => {
  const redis = getRedisConnection()
  if (!redis) return null

  const mod = await loadBullMQ()
  if (!mod) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const BullQueue = (mod as any).Queue
  const queue = new BullQueue(QUEUE_NAME, {
    connection: { url: redis.url },
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    },
  })

  return queue as AiQueue
}

type AiWorkerProcessor = (data: AiAnalysisJobData) => Promise<AiAnalysisJobResult>

const createAiWorker = async (
  processor: AiWorkerProcessor,
): Promise<{ close: () => Promise<void> } | null> => {
  const redis = getRedisConnection()
  if (!redis) return null

  const mod = await loadBullMQ()
  if (!mod) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const BullWorker = (mod as any).Worker
  const worker = new BullWorker(
    QUEUE_NAME,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (job: any) => processor(job.data as AiAnalysisJobData),
    {
      connection: { url: redis.url },
      concurrency: 1,
      limiter: { max: 10, duration: 60_000 },
    },
  )

  return { close: () => worker.close() }
}

export { createAiQueue, createAiWorker }
export type { AiQueue, AiWorkerProcessor }
