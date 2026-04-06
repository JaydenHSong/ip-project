// Design Ref: §4.4 — Marketing Stream webhook receiver
// POST /api/ads/stream/webhook — No auth (signature validated instead)

import { NextRequest, NextResponse } from 'next/server'
import { AmazonStreamAdapter } from '@/modules/ads/api/adapters/amazon-stream-adapter'
import { StreamService } from '@/modules/ads/api/services/stream-service'
import { createAdminClient } from '@/lib/supabase/admin'

const streamAdapter = new AmazonStreamAdapter()

export async function POST(request: NextRequest) {
  const signature = request.headers.get('x-amz-firehose-access-key') ?? ''
  const rawBody = await request.text()

  // Validate signature
  if (!streamAdapter.validateSignature(rawBody, signature)) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Invalid signature' } },
      { status: 401 },
    )
  }

  try {
    const payload = JSON.parse(rawBody) as unknown
    const batch = streamAdapter.parseMetrics(payload)

    if (!batch.profile_id || !batch.metrics.length) {
      return NextResponse.json(
        { error: { code: 'INVALID_PAYLOAD', message: 'Missing profile_id or empty metrics' } },
        { status: 400 },
      )
    }

    const streamService = new StreamService(createAdminClient())
    const result = await streamService.processMetrics(batch)

    return NextResponse.json({ data: result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Processing failed'
    return NextResponse.json(
      { error: { code: 'PROCESSING_ERROR', message } },
      { status: 500 },
    )
  }
}
