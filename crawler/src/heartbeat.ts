import { log } from './logger.js'

const HEARTBEAT_INTERVAL_MS = 30_000
const MAX_CONSECUTIVE_MISSES = 3

type WorkerState = {
  lastActive: Date
  consecutiveMisses: number
  alertSent: boolean
}

type HeartbeatMonitor = {
  recordActivity: (workerName: string) => void
  stop: () => void
}

const createHeartbeatMonitor = (
  webhookUrl: string | null,
  workerNames: string[],
): HeartbeatMonitor => {
  const states = new Map<string, WorkerState>()
  const now = new Date()

  for (const name of workerNames) {
    states.set(name, { lastActive: now, consecutiveMisses: 0, alertSent: false })
  }

  const sendAlert = async (text: string): Promise<void> => {
    if (!webhookUrl) return
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
        body: JSON.stringify({ text }),
      })
    } catch (err) {
      log('warn', 'heartbeat', `Failed to send heartbeat alert: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const intervalHandle = setInterval(() => {
    const checkTime = new Date()

    for (const [name, state] of states) {
      const msSinceActive = checkTime.getTime() - state.lastActive.getTime()
      const isInactive = msSinceActive >= HEARTBEAT_INTERVAL_MS

      if (isInactive) {
        state.consecutiveMisses += 1

        if (state.consecutiveMisses >= MAX_CONSECUTIVE_MISSES && !state.alertSent) {
          const idleSec = Math.floor(msSinceActive / 1000)
          log('warn', 'heartbeat', `${name} has been inactive for ${idleSec}s — sending alert`)
          sendAlert(
            `⚠️ *[Sentinel]* ${name} 비활성 감지\n` +
            `마지막 활동으로부터 *${idleSec}초* 경과\n` +
            `시각: ${checkTime.toLocaleString('ko-KR', { timeZone: 'America/Los_Angeles' })}`,
          ).catch(() => {})
          state.alertSent = true
        }
      } else {
        if (state.alertSent) {
          log('info', 'heartbeat', `${name} recovered — sending recovery alert`)
          sendAlert(
            `✅ *[Sentinel]* ${name} 복구됨\n` +
            `시각: ${checkTime.toLocaleString('ko-KR', { timeZone: 'America/Los_Angeles' })}`,
          ).catch(() => {})
        }
        state.consecutiveMisses = 0
        state.alertSent = false
      }
    }
  }, HEARTBEAT_INTERVAL_MS)

  const recordActivity = (workerName: string): void => {
    const state = states.get(workerName)
    if (state) {
      state.lastActive = new Date()
    }
  }

  const stop = (): void => {
    clearInterval(intervalHandle)
  }

  return { recordActivity, stop }
}

export { createHeartbeatMonitor }
export type { HeartbeatMonitor }
