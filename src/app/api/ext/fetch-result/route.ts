import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createAdminClient } from '@/lib/supabase/admin'
import { createListingFromFetch } from '@/lib/listings/create-from-fetch'

type FetchResultBody = {
  queue_id: string
  page_data: {
    asin: string
    title: string
    seller_name?: string | null
    seller_id?: string | null
    price_amount?: number | null
    price_currency?: string
    images?: string[]
    bullet_points?: string[]
    brand?: string | null
    rating?: number | null
    review_count?: number | null
    url?: string
    marketplace?: string
  }
  screenshot_base64?: string
}

// POST /api/ext/fetch-result — Extension이 fetch 결과를 전송
export const POST = withAuth(async (req: NextRequest, { user }) => {
  const body = (await req.json()) as FetchResultBody
  const { queue_id, page_data, screenshot_base64 } = body

  if (!queue_id || !page_data?.asin) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Missing queue_id or page_data.asin' } },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()

  // Queue item 확인
  const { data: queueItem } = await supabase
    .from('extension_fetch_queue')
    .select('id, asin, marketplace, status, metadata')
    .eq('id', queue_id)
    .single()

  if (!queueItem) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Queue item not found' } },
      { status: 404 },
    )
  }

  if (queueItem.status === 'completed') {
    return NextResponse.json(
      { error: { code: 'ALREADY_COMPLETED', message: 'Already completed' } },
      { status: 409 },
    )
  }

  // Screenshot upload
  let screenshotUrl: string | null = null
  if (screenshot_base64) {
    try {
      const base64Data = screenshot_base64.replace(/^data:image\/\w+;base64,/, '')
      const buffer = Buffer.from(base64Data, 'base64')

      const mimeMatch = screenshot_base64.match(/^data:(image\/\w+);base64,/)
      const detectedMime = mimeMatch?.[1] ?? 'image/webp'
      const ext = detectedMime === 'image/jpeg' ? 'jpg' : detectedMime === 'image/png' ? 'png' : 'webp'
      const contentType = detectedMime
      const fileName = `fetch-${page_data.asin}-${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('screenshots')
        .upload(fileName, buffer, {
          contentType,
          upsert: false,
        })

      if (uploadError) {
        console.error(`[fetch-result] Screenshot upload error:`, uploadError.message)
      } else {
        const { data: urlData } = supabase.storage
          .from('screenshots')
          .getPublicUrl(fileName)
        screenshotUrl = urlData.publicUrl
      }
    } catch (err) {
      console.error(`[fetch-result] Screenshot upload exception:`, (err as Error).message)
    }
  }

  // Screenshot-for-report: metadata에 report_id가 있으면 해당 report에 스크린샷 저장
  const metadata = queueItem.metadata as { report_id?: string; purpose?: string } | null
  if (metadata?.report_id && screenshotUrl) {
    try {
      // screenshots 배열에 추가
      const { data: existingReport } = await supabase
        .from('reports')
        .select('screenshots')
        .eq('id', metadata.report_id)
        .single()

      const existingScreenshots = (existingReport?.screenshots ?? []) as { url: string; captured_at: string; source: string }[]
      const newEntry = {
        url: screenshotUrl,
        captured_at: new Date().toISOString(),
        source: 'bgfetch',
      }

      await supabase
        .from('reports')
        .update({
          screenshot_url: screenshotUrl,
          screenshots: [...existingScreenshots, newEntry],
        })
        .eq('id', metadata.report_id)
    } catch {
      // Report screenshot update failure is non-fatal
    }
  }

  // screenshot-only 요청이면 listing 생성 없이 완료 처리
  if (metadata?.purpose === 'screenshot') {
    const hasScreenshot = !!screenshotUrl
    await supabase
      .from('extension_fetch_queue')
      .update({
        status: hasScreenshot ? 'completed' : 'failed',
        result: {
          screenshot_url: screenshotUrl,
          report_id: metadata.report_id,
          debug: {
            screenshot_received: !!screenshot_base64,
            screenshot_len: screenshot_base64?.length ?? 0,
          },
        },
        error: hasScreenshot ? null : `Screenshot not captured (received=${!!screenshot_base64}, len=${screenshot_base64?.length ?? 0})`,
        completed_at: new Date().toISOString(),
      })
      .eq('id', queue_id)

    return NextResponse.json({
      screenshot_url: screenshotUrl,
      report_id: metadata.report_id,
      screenshot_received: !!screenshot_base64,
      screenshot_len: screenshot_base64?.length ?? 0,
    }, { status: hasScreenshot ? 201 : 200 })
  }

  // Create listing
  try {
    const { listing, isExisting } = await createListingFromFetch({
      pageData: page_data,
      marketplace: queueItem.marketplace,
      userId: user.id,
      screenshotUrl,
      source: 'extension',
      supabase,
    })

    // Update queue as completed
    await supabase
      .from('extension_fetch_queue')
      .update({
        status: 'completed',
        result: { listing_id: (listing as Record<string, unknown>).id, is_existing: isExisting },
        completed_at: new Date().toISOString(),
      })
      .eq('id', queue_id)

    // Trigger AI analysis (fire-and-forget)
    if (!isExisting) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin
      fetch(`${baseUrl}/api/ai/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: req.headers.get('cookie') ?? '',
        },
        body: JSON.stringify({ listing_id: (listing as Record<string, unknown>).id, async: true }),
      }).catch(() => {})
    }

    return NextResponse.json({
      listing,
      screenshot_url: screenshotUrl,
      is_existing: isExisting,
    }, { status: 201 })
  } catch (err) {
    // Update queue as failed
    await supabase
      .from('extension_fetch_queue')
      .update({
        status: 'failed',
        error: err instanceof Error ? err.message : 'Unknown error',
        completed_at: new Date().toISOString(),
      })
      .eq('id', queue_id)

    return NextResponse.json(
      { error: { code: 'CREATE_ERROR', message: err instanceof Error ? err.message : 'Failed to create listing' } },
      { status: 500 },
    )
  }
}, ['owner', 'admin', 'editor', 'viewer_plus', 'viewer'])
