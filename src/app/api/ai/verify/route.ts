// 스크린샷 검증 API
// POST /api/ai/verify — Haiku Vision 크로스체크

import { NextRequest, NextResponse } from 'next/server'
import { withServiceAuth } from '@/lib/auth/service-middleware'
import { createClaudeClient } from '@/lib/ai/client'
import { verifyScreenshot } from '@/lib/ai/verify-screenshot'

type VerifyScreenshotRequest = {
  listing_id: string
  screenshot_url: string
  parsed_data: {
    title: string
    price: string | null
    seller: string | null
    rating: string | null
  }
}

export const POST = withServiceAuth(async (req: NextRequest) => {
  const body = await req.json() as VerifyScreenshotRequest

  if (!body.screenshot_url || !body.parsed_data) {
    return NextResponse.json(
      { error: { code: 'MISSING_FIELD', message: 'screenshot_url and parsed_data are required' } },
      { status: 400 },
    )
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: { code: 'CONFIG_ERROR', message: 'ANTHROPIC_API_KEY not configured' } },
      { status: 500 },
    )
  }

  const client = createClaudeClient(apiKey)

  const result = await verifyScreenshot(client, body.screenshot_url, body.parsed_data)

  return NextResponse.json(result)
})
