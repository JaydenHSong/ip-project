import { NextResponse } from 'next/server'
import { checkHealth, restartService, getServiceConfigs, notifyChat } from '@/lib/ops/railway-api'

type OpsCommand = {
  command: 'status' | 'restart'
  target?: 'crawl' | 'br'
}

// Ops API — 상태 조회/재시작 후 Google Chat Webhook으로 알림
export const POST = async (req: Request): Promise<Response> => {
  try {
    const body = (await req.json()) as OpsCommand

    // status는 인증 없이 허용
    if (body.command === 'status') {
      const result = await handleStatus()
      return NextResponse.json(result)
    }

    // restart는 토큰 필요
    if (body.command === 'restart' && body.target) {
      const token = req.headers.get('x-ops-token')
      const expected = process.env['CRAWLER_SERVICE_TOKEN']
      if (expected && token !== expected) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      const result = await handleRestart(body.target)
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: 'Invalid command' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

const handleStatus = async () => {
  const services = getServiceConfigs()
  const results: Record<string, boolean> = {}
  const lines: string[] = ['🛡️ *Sentinel 서비스 상태*', '']

  for (const service of services) {
    const healthy = await checkHealth(service.healthUrl)
    results[service.name] = healthy
    lines.push(`${healthy ? '🟢' : '🔴'} ${service.name}: ${healthy ? '정상' : '비정상'}`)
  }

  lines.push('', `⏱️ ${new Date().toLocaleString('ko-KR', { timeZone: 'America/Los_Angeles' })}`)
  await notifyChat(lines.join('\n'))

  return { ok: true, results }
}

const handleRestart = async (target: 'crawl' | 'br') => {
  const services = getServiceConfigs()
  const service = services.find((s) =>
    target === 'crawl' ? s.name === 'sentinel-crawl' : s.name === 'sentinel-br'
  )

  if (!service) {
    return { ok: false, error: `${target} service not found` }
  }

  const success = await restartService(service.serviceId)
  const time = new Date().toLocaleString('ko-KR', { timeZone: 'America/Los_Angeles' })

  if (success) {
    await notifyChat(`🔄 *${service.name}* 수동 재시작 요청 완료\n⏱️ ${time}`)
    return { ok: true, service: service.name }
  }

  await notifyChat(`🚨 *${service.name}* 재시작 실패\n⏱️ ${time}`)
  return { ok: false, error: 'Railway API error' }
}
