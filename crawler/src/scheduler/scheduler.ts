import type { Queue } from 'bullmq'
import type { CrawlJobData, Campaign } from '../types/index.js'
import type { SentinelClient } from '../api/sentinel-client.js'
import { log } from '../logger.js'

// 빈도 → 밀리초 매핑
const FREQUENCY_MS: Record<string, number> = {
  daily: 24 * 60 * 60 * 1000,
  every_12h: 12 * 60 * 60 * 1000,
  every_6h: 6 * 60 * 60 * 1000,
  every_3d: 3 * 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
}

// 캠페인 스케줄 동기화 주기 (5분)
const SYNC_INTERVAL_MS = 5 * 60 * 1000

// 현재 등록된 캠페인 ID 추적
const registeredCampaigns = new Map<string, string>() // campaignId → frequency

// 캠페인 스케줄 동기화
const syncCampaigns = async (
  queue: Queue<CrawlJobData>,
  sentinelClient: SentinelClient,
): Promise<void> => {
  try {
    const campaigns = await sentinelClient.getActiveCampaigns()
    const activeCampaignIds = new Set(campaigns.map((c) => c.id))

    // 신규/변경 캠페인 → 잡 등록
    for (const campaign of campaigns) {
      const existingFrequency = registeredCampaigns.get(campaign.id)
      const frequency = campaign.frequency || 'daily'

      if (existingFrequency === frequency) continue // 변경 없음

      // 기존 잡 제거 (변경된 경우)
      if (existingFrequency) {
        await removeRepeatableJob(queue, campaign.id)
      }

      // 새 반복 잡 등록
      await addRepeatableJob(queue, campaign, frequency)
      registeredCampaigns.set(campaign.id, frequency)

      // 신규 캠페인 → 즉시 1회 실행 (반복 잡은 interval 후 첫 실행이라 대기 발생)
      if (!existingFrequency) {
        await addImmediateJob(queue, campaign)
      }
    }

    // 비활성화/삭제된 캠페인 → 반복 잡 + 즉시/대기 잡 모두 제거
    for (const [campaignId] of registeredCampaigns) {
      if (!activeCampaignIds.has(campaignId)) {
        await removeRepeatableJob(queue, campaignId)
        await removeQueuedJobs(queue, campaignId)
        registeredCampaigns.delete(campaignId)
        log('info', 'scheduler', `Removed all jobs for deactivated campaign: ${campaignId}`)
      }
    }

    // Redis orphan repeatable job 정리 — 크롤러 재시작 시 in-memory Map이 초기화되어
    // registeredCampaigns에 없는 잡이 Redis에 남아 영원히 실행되는 문제 방지
    const repeatableJobs = await queue.getRepeatableJobs()
    for (const job of repeatableJobs) {
      const match = job.id?.match(/^campaign-(.+)$/)
      if (!match) continue
      const campaignId = match[1]!
      if (!activeCampaignIds.has(campaignId)) {
        await queue.removeRepeatableByKey(job.key)
        log('warn', 'scheduler', `Removed orphan repeatable job: ${job.id} (campaign not in active list)`)
      }
    }

    log('info', 'scheduler', `Synced ${campaigns.length} active campaigns (${registeredCampaigns.size} jobs registered)`)
  } catch (error) {
    log('error', 'scheduler', `Failed to sync campaigns: ${error instanceof Error ? error.message : String(error)}`)
  }
}

const addRepeatableJob = async (
  queue: Queue<CrawlJobData>,
  campaign: Campaign,
  frequency: string,
): Promise<void> => {
  const repeatInterval = FREQUENCY_MS[frequency] ?? FREQUENCY_MS['daily']!

  const jobData: CrawlJobData = {
    campaignId: campaign.id,
    keyword: campaign.keyword,
    marketplace: campaign.marketplace,
    maxPages: campaign.max_pages,
  }

  await queue.add(`campaign-${campaign.id}`, jobData, {
    repeat: {
      every: repeatInterval,
    },
    jobId: `campaign-${campaign.id}`,
  })

  log('info', 'scheduler', `Registered repeatable job: "${campaign.keyword}" (${frequency})`, {
    campaignId: campaign.id,
  })
}

// 신규 캠페인 지연 실행 (캠페인 간 간격을 두어 동시 접속 방지)
let immediateJobIndex = 0

const addImmediateJob = async (
  queue: Queue<CrawlJobData>,
  campaign: Campaign,
): Promise<void> => {
  const jobData: CrawlJobData = {
    campaignId: campaign.id,
    keyword: campaign.keyword,
    marketplace: campaign.marketplace,
    maxPages: campaign.max_pages,
  }

  // 캠페인마다 2~5분 간격으로 stagger (동시 접속 방지)
  const delayMs = immediateJobIndex * (2 * 60 * 1000 + Math.floor(Math.random() * 3 * 60 * 1000))
  immediateJobIndex++

  await queue.add(`immediate-${campaign.id}`, jobData, {
    priority: 1,
    delay: delayMs,
  })

  const delayMin = Math.round(delayMs / 60_000)
  log('info', 'scheduler', `Queued crawl for "${campaign.keyword}" (starts in ~${delayMin}min)`, {
    campaignId: campaign.id,
  })
}

const removeRepeatableJob = async (
  queue: Queue<CrawlJobData>,
  campaignId: string,
): Promise<void> => {
  const repeatableJobs = await queue.getRepeatableJobs()
  for (const job of repeatableJobs) {
    if (job.id === `campaign-${campaignId}`) {
      await queue.removeRepeatableByKey(job.key)
      log('info', 'scheduler', `Removed repeatable job for campaign: ${campaignId}`)
      break
    }
  }
}

// 큐에 대기 중인 즉시/지연 잡 제거
const removeQueuedJobs = async (
  queue: Queue<CrawlJobData>,
  campaignId: string,
): Promise<void> => {
  const waitingJobs = await queue.getJobs(['waiting', 'delayed'])
  let removed = 0
  for (const job of waitingJobs) {
    if (job.data?.campaignId === campaignId) {
      await job.remove().catch(() => {})
      removed++
    }
  }
  if (removed > 0) {
    log('info', 'scheduler', `Removed ${removed} queued job(s) for campaign: ${campaignId}`)
  }
}

// 스케줄러 시작
const startScheduler = async (
  queue: Queue<CrawlJobData>,
  sentinelClient: SentinelClient,
): Promise<NodeJS.Timeout> => {
  log('info', 'scheduler', 'Starting campaign scheduler')

  // 즉시 첫 동기화
  await syncCampaigns(queue, sentinelClient)

  // 5분마다 동기화 반복
  const interval = setInterval(() => {
    syncCampaigns(queue, sentinelClient).catch((error) => {
      log('error', 'scheduler', `Scheduler sync error: ${error instanceof Error ? error.message : String(error)}`)
    })
  }, SYNC_INTERVAL_MS)

  return interval
}

export { startScheduler, syncCampaigns }
