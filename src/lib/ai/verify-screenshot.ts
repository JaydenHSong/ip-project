// 스크린샷 검증 모듈 — Haiku Vision
// 파싱 데이터 vs 스크린샷 크로스체크

import { MODEL_ROLES, type ClaudeClient, type ScreenshotVerification } from '@/types/ai'
import { buildMonitorSystemPrompt } from './prompts/system'
import { buildVerifyPrompt } from './prompts/verify'

const fetchImageAsBase64 = async (url: string): Promise<{
  base64: string
  mediaType: string
} | null> => {
  try {
    const response = await fetch(url)
    if (!response.ok) return null

    const contentType = response.headers.get('content-type') ?? 'image/jpeg'
    const buffer = await response.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')

    return { base64, mediaType: contentType }
  } catch {
    return null
  }
}

const parseVerificationResponse = (raw: string): ScreenshotVerification => {
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return {
      match: true,
      corrections: null,
      mismatchFields: [],
      confidence: 0,
      rawResponse: raw,
    }
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      match?: boolean
      corrections?: Record<string, string> | null
      mismatchFields?: string[]
      confidence?: number
    }

    return {
      match: parsed.match ?? true,
      corrections: parsed.corrections ?? null,
      mismatchFields: parsed.mismatchFields ?? [],
      confidence: parsed.confidence ?? 0,
      rawResponse: raw,
    }
  } catch {
    return {
      match: true,
      corrections: null,
      mismatchFields: [],
      confidence: 0,
      rawResponse: raw,
    }
  }
}

const verifyScreenshot = async (
  client: ClaudeClient,
  screenshotUrl: string,
  parsedData: {
    title: string
    price: string | null
    seller: string | null
    rating: string | null
  },
): Promise<ScreenshotVerification> => {
  const image = await fetchImageAsBase64(screenshotUrl)
  if (!image) {
    return {
      match: true,
      corrections: null,
      mismatchFields: [],
      confidence: 0,
      rawResponse: 'Failed to fetch screenshot image',
    }
  }

  const systemPrompt = buildMonitorSystemPrompt()
  const userPrompt = buildVerifyPrompt(parsedData)

  const response = await client.callWithImages({
    model: MODEL_ROLES.monitor,
    systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
    maxTokens: 1024,
    temperature: 0.1,
    images: [image],
  })

  return parseVerificationResponse(response.content)
}

export { verifyScreenshot }
