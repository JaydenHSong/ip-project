import { NextResponse } from 'next/server'
import { checkHealth, restartService, getServiceConfigs } from '@/lib/ops/railway-api'

type ChatEvent = {
  type: string
  message?: {
    text?: string
    argumentText?: string
    sender?: { displayName?: string }
  }
}

// Google Workspace Add-on DataActions format for Chat messages
const chatResponse = (text: string) => ({
  hostAppDataAction: {
    chatDataAction: {
      createMessageAction: {
        message: { text },
      },
    },
  },
})

// Google Chat App HTTP endpoint (Workspace Add-on mode)
export const POST = async (req: Request): Promise<Response> => {
  try {
    const event = (await req.json()) as ChatEvent

    if (event.type === 'ADDED_TO_SPACE') {
      return NextResponse.json(
        chatResponse('🛡️ Sentinel Ops Bot 연결됨\n\n사용 가능한 명령:\n• 상태 — 서비스 상태 조회\n• 재시작 crawl — Crawl 서비스 재시작\n• 재시작 br — BR 서비스 재시작')
      )
    }

    if (event.type === 'MESSAGE') {
      const raw = event.message?.argumentText ?? event.message?.text ?? ''
      const text = raw.trim().toLowerCase()
      const response = await handleCommand(text)
      return NextResponse.json(chatResponse(response))
    }

    return NextResponse.json(chatResponse(''))
  } catch {
    return NextResponse.json(chatResponse('⚠️ 요청 처리 중 오류가 발생했습니다.'))
  }
}

const handleCommand = async (text: string): Promise<string> => {
  if (text === '상태' || text === 'status') {
    return handleStatus()
  }

  const restartMatch = text.match(/^(재시작|restart)\s+(crawl|br)$/)
  if (restartMatch) {
    const target = restartMatch[2] as 'crawl' | 'br'
    return handleRestart(target)
  }

  return '📋 사용 가능한 명령:\n• 상태 — 서비스 상태 조회\n• 재시작 crawl — Crawl 서비스 재시작\n• 재시작 br — BR 서비스 재시작'
}

const handleStatus = async (): Promise<string> => {
  const services = getServiceConfigs()
  if (services.length === 0) {
    return '⚠️ 서비스가 설정되지 않았습니다.'
  }

  const lines: string[] = ['🛡️ Sentinel 서비스 상태', '']
  for (const service of services) {
    const healthy = await checkHealth(service.healthUrl)
    const icon = healthy ? '🟢' : '🔴'
    lines.push(`${icon} ${service.name}: ${healthy ? '정상' : '비정상'}`)
  }
  lines.push('', `⏱️ ${new Date().toLocaleString('ko-KR', { timeZone: 'America/Los_Angeles' })}`)
  return lines.join('\n')
}

const handleRestart = async (target: 'crawl' | 'br'): Promise<string> => {
  const services = getServiceConfigs()
  const service = services.find((s) =>
    target === 'crawl' ? s.name === 'sentinel-crawl' : s.name === 'sentinel-br'
  )

  if (!service) {
    return `⚠️ ${target} 서비스를 찾을 수 없습니다.`
  }

  const success = await restartService(service.serviceId)
  const time = new Date().toLocaleString('ko-KR', { timeZone: 'America/Los_Angeles' })

  if (success) {
    return `🔄 ${service.name} 재시작 요청 완료\n⏱️ ${time}`
  }

  return `🚨 ${service.name} 재시작 실패 — Railway API 에러\n⏱️ ${time}`
}
