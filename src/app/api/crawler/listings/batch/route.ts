import { NextRequest, NextResponse } from 'next/server'
import { withServiceAuth } from '@/lib/auth/service-middleware'
import { checkSuspectListing } from '@/lib/utils/suspect-filter'
import { createAdminClient } from '@/lib/supabase/admin'

// FR-01: 의심 리스팅 → AI 분석 자동 트리거
const triggerAiAnalysis = (req: NextRequest, listingId: string): void => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin

  fetch(`${baseUrl}/api/ai/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.CRAWLER_SERVICE_TOKEN}`,
    },
    body: JSON.stringify({
      listing_id: listingId,
      async: true,
      source: 'crawler',
      priority: 'normal',
    }),
  }).catch((e) => {
    console.error(`[AI trigger failed] listing=${listingId}:`, e instanceof Error ? e.message : e)
  })
}

// 스크린샷 base64 → Supabase Storage 업로드 → public URL 반환
const uploadScreenshot = async (
  supabase: ReturnType<typeof createAdminClient>,
  asin: string,
  base64Data: string,
): Promise<string | null> => {
  try {
    const isWebp = base64Data.startsWith('UklGR') // WebP magic bytes in base64
    const ext = isWebp ? 'webp' : 'jpg'
    const contentType = isWebp ? 'image/webp' : 'image/jpeg'
    const fileName = `crawler/${asin}_${Date.now()}.${ext}`
    const buffer = Buffer.from(base64Data, 'base64')
    const { error } = await supabase.storage
      .from('screenshots')
      .upload(fileName, buffer, {
        contentType,
        upsert: false,
      })

    if (error) {
      console.error(`[Screenshot upload failed] ${asin}:`, error.message)
      return null
    }

    const { data: urlData } = supabase.storage
      .from('screenshots')
      .getPublicUrl(fileName)

    return urlData.publicUrl
  } catch (e) {
    console.error(`[Screenshot upload error] ${asin}:`, e instanceof Error ? e.message : e)
    return null
  }
}

type CrawlerAiResultPayload = {
  is_violation: boolean
  violation_types: string[]
  confidence: number
  reasons: string[]
  evidence_summary: string
}

type BatchListingItem = {
  asin: string
  marketplace: string
  title: string
  description?: string
  bullet_points?: string[]
  images?: { url: string; position: number }[]
  price_amount?: number
  price_currency?: string
  seller_name?: string
  seller_id?: string
  brand?: string
  category?: string
  rating?: number
  review_count?: number
  source_campaign_id: string
  screenshot_base64?: string
  crawler_ai_result?: CrawlerAiResultPayload
}

// POST /api/crawler/listings/batch — 배치 리스팅 저장 (Crawler 전용)
export const POST = withServiceAuth(async (req) => {
  const body = await req.json() as { listings: BatchListingItem[] }

  if (!body.listings || !Array.isArray(body.listings) || body.listings.length === 0) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Required: listings array (non-empty)' } },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()

  let created = 0
  let duplicates = 0
  const errors: { asin: string; error: string }[] = []

  for (const item of body.listings) {
    if (!item.asin || !item.marketplace || !item.title || !item.source_campaign_id) {
      errors.push({ asin: item.asin ?? 'unknown', error: 'Missing required fields' })
      continue
    }

    // 크롤러가 이미 AI 판정한 경우 → is_suspect 강제 true
    const hasCrawlerAiResult = item.crawler_ai_result?.is_violation === true

    const { is_suspect, suspect_reasons } = hasCrawlerAiResult
      ? { is_suspect: true, suspect_reasons: item.crawler_ai_result!.reasons }
      : checkSuspectListing({
          title: item.title,
          description: item.description,
          bullet_points: item.bullet_points,
          brand: item.brand,
          seller_name: item.seller_name,
        })

    // 스크린샷 Storage 업로드
    let screenshotUrl: string | null = null
    if (item.screenshot_base64) {
      screenshotUrl = await uploadScreenshot(supabase, item.asin, item.screenshot_base64)
    }

    const { data: inserted, error } = await supabase
      .from('listings')
      .insert({
        asin: item.asin,
        marketplace: item.marketplace,
        title: item.title,
        description: item.description ?? null,
        bullet_points: item.bullet_points ?? [],
        images: item.images ?? [],
        price_amount: item.price_amount ?? null,
        price_currency: item.price_currency ?? 'USD',
        seller_name: item.seller_name ?? null,
        seller_id: item.seller_id ?? null,
        brand: item.brand ?? null,
        category: item.category ?? null,
        rating: item.rating ?? null,
        review_count: item.review_count ?? null,
        is_suspect,
        suspect_reasons,
        screenshot_url: screenshotUrl,
        crawler_ai_result: item.crawler_ai_result ?? null,
        source: 'crawler',
        source_campaign_id: item.source_campaign_id,
        source_user_id: null,
        raw_data: null,
      })
      .select('id')
      .single()

    if (error) {
      if (error.code === '23505') {
        duplicates++
      } else {
        errors.push({ asin: item.asin, error: error.message })
      }
    } else {
      created++
      // 의심 리스팅 → AI 정밀 분석 트리거
      if (is_suspect && inserted?.id) {
        triggerAiAnalysis(req, inserted.id)
      }
    }
  }

  return NextResponse.json({ created, duplicates, errors })
})
