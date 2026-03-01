import type { CrawlResult } from '../types/index.js'
import { log } from '../logger.js'

type ChatNotifier = {
  notifyCrawlComplete: (campaignKeyword: string, result: CrawlResult) => Promise<void>
  notifyCrawlFailed: (campaignKeyword: string, error: string) => Promise<void>
  notifyMessage: (text: string) => Promise<void>
}

// Google Chat Webhook 알림 전송
const createChatNotifier = (webhookUrl: string | null): ChatNotifier => {
  const send = async (text: string): Promise<void> => {
    if (!webhookUrl) return

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
        body: JSON.stringify({ text }),
      })
    } catch (error) {
      log('warn', 'google-chat', 'Failed to send notification', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    if (minutes > 0) {
      return `${minutes}분 ${remainingSeconds}초`
    }
    return `${seconds}초`
  }

  return {
    notifyCrawlComplete: async (campaignKeyword: string, result: CrawlResult): Promise<void> => {
      const text = [
        `✅ *[Sentinel Crawler]* "${campaignKeyword}" 캠페인 완료`,
        `수집: ${result.totalFound}건 | 전송: ${result.totalSent}건 | 중복: ${result.duplicates}건 | 에러: ${result.errors}건`,
        `소요: ${formatDuration(result.duration)}`,
      ].join('\n')

      await send(text)
    },

    notifyCrawlFailed: async (campaignKeyword: string, error: string): Promise<void> => {
      const text = [
        `❌ *[Sentinel Crawler]* "${campaignKeyword}" 캠페인 실패`,
        `원인: ${error}`,
      ].join('\n')

      await send(text)
    },

    notifyMessage: async (text: string): Promise<void> => {
      await send(text)
    },
  }
}

export { createChatNotifier }
export type { ChatNotifier }
