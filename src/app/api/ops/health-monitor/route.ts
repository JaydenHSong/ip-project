import { NextResponse } from 'next/server'
import { getServiceConfigs, checkHealth, restartService, notifyChat } from '@/lib/ops/railway-api'

// Vercel Cron: 1분마다 실행
// 3회 연속 체크 (5초 간격) 실패 시 자동 재시작
export const GET = async (req: Request): Promise<Response> => {
  // Vercel Cron 인증
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env['CRON_SECRET']
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const services = getServiceConfigs()
  if (services.length === 0) {
    return NextResponse.json({ error: 'No services configured' }, { status: 500 })
  }

  const results: Record<string, { healthy: boolean; restarted: boolean }> = {}

  for (const service of services) {
    const healthy = await checkHealth(service.healthUrl)

    if (healthy) {
      results[service.name] = { healthy: true, restarted: false }
      continue
    }

    // 첫 번째 실패 → 5초 후 재확인
    await sleep(5_000)
    const retry1 = await checkHealth(service.healthUrl)
    if (retry1) {
      results[service.name] = { healthy: true, restarted: false }
      continue
    }

    // 두 번째 실패 → 5초 후 마지막 확인
    await sleep(5_000)
    const retry2 = await checkHealth(service.healthUrl)
    if (retry2) {
      results[service.name] = { healthy: true, restarted: false }
      continue
    }

    // 3회 연속 실패 → 자동 재시작
    const restarted = await restartService(service.serviceId)
    results[service.name] = { healthy: false, restarted }

    await notifyChat(
      restarted
        ? `🔄 *[Sentinel Ops]* ${service.name} 자동 재시작 (3회 연속 비정상)\n시각: ${new Date().toLocaleString('ko-KR', { timeZone: 'America/Los_Angeles' })}`
        : `🚨 *[Sentinel Ops]* ${service.name} 비정상 — 재시작 실패!\n시각: ${new Date().toLocaleString('ko-KR', { timeZone: 'America/Los_Angeles' })}`
    )
  }

  return NextResponse.json({ results, checkedAt: new Date().toISOString() })
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

// Vercel Cron: max 60s execution, 3 checks × 10s timeout + 10s gap = ~40s
export const maxDuration = 60
