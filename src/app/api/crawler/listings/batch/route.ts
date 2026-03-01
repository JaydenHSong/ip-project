import { NextRequest, NextResponse } from 'next/server'
import { withServiceAuth } from '@/lib/auth/service-middleware'
import { checkSuspectListing } from '@/lib/utils/suspect-filter'
import { createClient } from '@/lib/supabase/server'

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

  const supabase = await createClient()

  let created = 0
  let duplicates = 0
  const errors: { asin: string; error: string }[] = []

  for (const item of body.listings) {
    if (!item.asin || !item.marketplace || !item.title || !item.source_campaign_id) {
      errors.push({ asin: item.asin ?? 'unknown', error: 'Missing required fields' })
      continue
    }

    const { is_suspect, suspect_reasons } = checkSuspectListing({
      title: item.title,
      description: item.description,
      bullet_points: item.bullet_points,
      brand: item.brand,
      seller_name: item.seller_name,
    })

    const { error } = await supabase
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
        source: 'crawler',
        source_campaign_id: item.source_campaign_id,
        source_user_id: null,
        raw_data: null,
      })

    if (error) {
      if (error.code === '23505') {
        duplicates++
      } else {
        errors.push({ asin: item.asin, error: error.message })
      }
    } else {
      created++
    }
  }

  return NextResponse.json({ created, duplicates, errors })
})
