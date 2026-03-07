import { NextRequest, NextResponse } from 'next/server'
import { withServiceAuth } from '@/lib/auth/service-middleware'
import { checkSuspectListing } from '@/lib/utils/suspect-filter'
import { createAdminClient } from '@/lib/supabase/admin'

const uploadScreenshot = async (
  supabase: ReturnType<typeof createAdminClient>,
  asin: string,
  base64Data: string,
): Promise<string | null> => {
  try {
    const isWebp = base64Data.startsWith('UklGR')
    const ext = isWebp ? 'webp' : 'jpg'
    const contentType = isWebp ? 'image/webp' : 'image/jpeg'
    const fileName = `crawler/${asin}_${Date.now()}.${ext}`
    const buffer = Buffer.from(base64Data, 'base64')
    const { error } = await supabase.storage
      .from('screenshots')
      .upload(fileName, buffer, { contentType, upsert: false })

    if (error) return null

    const { data: urlData } = supabase.storage
      .from('screenshots')
      .getPublicUrl(fileName)

    return urlData.publicUrl
  } catch {
    return null
  }
}

// POST /api/crawler/listings — 단건 리스팅 저장 (Crawler 전용)
export const POST = withServiceAuth(async (req) => {
  const body = await req.json() as {
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
  }

  if (!body.asin || !body.marketplace || !body.title || !body.source_campaign_id) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Required: asin, marketplace, title, source_campaign_id' } },
      { status: 400 },
    )
  }

  const { is_suspect, suspect_reasons } = checkSuspectListing({
    title: body.title,
    description: body.description,
    bullet_points: body.bullet_points,
    brand: body.brand,
    seller_name: body.seller_name,
  })

  const supabase = createAdminClient()

  let screenshotUrl: string | null = null
  if (body.screenshot_base64) {
    screenshotUrl = await uploadScreenshot(supabase, body.asin, body.screenshot_base64)
  }

  const { data, error } = await supabase
    .from('listings')
    .insert({
      asin: body.asin,
      marketplace: body.marketplace,
      title: body.title,
      description: body.description ?? null,
      bullet_points: body.bullet_points ?? [],
      images: body.images ?? [],
      price_amount: body.price_amount ?? null,
      price_currency: body.price_currency ?? 'USD',
      seller_name: body.seller_name ?? null,
      seller_id: body.seller_id ?? null,
      brand: body.brand ?? null,
      category: body.category ?? null,
      rating: body.rating ?? null,
      review_count: body.review_count ?? null,
      is_suspect,
      suspect_reasons,
      screenshot_url: screenshotUrl,
      source: 'crawler',
      source_campaign_id: body.source_campaign_id,
      source_user_id: null,
      raw_data: null,
    })
    .select('id, asin, is_suspect, suspect_reasons, created_at')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: { code: 'DUPLICATE_LISTING', message: 'Duplicate listing (same ASIN+marketplace+date)' } },
        { status: 409 },
      )
    }
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  return NextResponse.json(data, { status: 201 })
})
