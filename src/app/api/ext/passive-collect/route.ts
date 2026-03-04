import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { checkSuspectListing } from '@/lib/utils/suspect-filter'
import { createAdminClient } from '@/lib/supabase/admin'
import type { PassiveCollectRequest, PassiveCollectPageData, PassiveCollectSearchData } from '@/types/api'

const MAX_ITEMS = 100

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
      source: 'extension',
      priority: 'normal',
    }),
  }).catch(() => {})
}

const processPageItem = async (
  supabase: ReturnType<typeof createAdminClient>,
  req: NextRequest,
  data: PassiveCollectPageData,
  userId: string,
): Promise<'created' | 'duplicate' | { error: string }> => {
  const { is_suspect, suspect_reasons } = checkSuspectListing({
    title: data.title,
    bullet_points: data.bullet_points,
    brand: data.brand,
    seller_name: data.seller_name,
  })

  const { data: inserted, error } = await supabase
    .from('listings')
    .insert({
      asin: data.asin,
      marketplace: data.marketplace,
      title: data.title,
      bullet_points: data.bullet_points ?? [],
      images: [],
      price_amount: data.price_amount ?? null,
      price_currency: data.price_currency ?? 'USD',
      seller_name: data.seller_name ?? null,
      seller_id: data.seller_id ?? null,
      brand: data.brand ?? null,
      rating: data.rating ?? null,
      review_count: data.review_count ?? null,
      is_suspect,
      suspect_reasons,
      source: 'extension_passive',
      source_user_id: userId,
      raw_data: { url: data.url },
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') return 'duplicate'
    return { error: error.message }
  }

  if (is_suspect && inserted?.id) {
    triggerAiAnalysis(req, inserted.id)
  }

  return 'created'
}

const processSearchItem = async (
  supabase: ReturnType<typeof createAdminClient>,
  req: NextRequest,
  searchData: PassiveCollectSearchData,
  userId: string,
): Promise<{ created: number; duplicates: number; errors: { asin: string; error: string }[] }> => {
  let created = 0
  let duplicates = 0
  const errors: { asin: string; error: string }[] = []

  for (const item of searchData.items) {
    const { is_suspect, suspect_reasons } = checkSuspectListing({
      title: item.title,
      brand: item.brand,
    })

    const { data: inserted, error } = await supabase
      .from('listings')
      .insert({
        asin: item.asin,
        marketplace: searchData.marketplace,
        title: item.title,
        bullet_points: [],
        images: [],
        price_amount: item.price_amount ?? null,
        price_currency: item.price_currency ?? 'USD',
        brand: item.brand ?? null,
        rating: item.rating ?? null,
        review_count: item.review_count ?? null,
        is_suspect,
        suspect_reasons,
        source: 'extension_passive',
        source_user_id: userId,
        raw_data: {
          search_term: searchData.search_term,
          page_number: searchData.page_number,
          is_sponsored: item.is_sponsored,
          url: searchData.url,
        },
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
      if (is_suspect && inserted?.id) {
        triggerAiAnalysis(req, inserted.id)
      }
    }
  }

  return { created, duplicates, errors }
}

// POST /api/ext/passive-collect — 익스텐션 패시브 수집 배치 수신
export const POST = withAuth(async (req, { user }) => {
  const body = (await req.json()) as PassiveCollectRequest

  if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Required: items array (non-empty)' } },
      { status: 400 },
    )
  }

  if (body.items.length > MAX_ITEMS) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: `Max ${MAX_ITEMS} items per request` } },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()
  let totalCreated = 0
  let totalDuplicates = 0
  const totalErrors: { asin: string; error: string }[] = []

  for (const item of body.items) {
    if (!item.type || !item.data) {
      totalErrors.push({ asin: 'unknown', error: 'Missing type or data' })
      continue
    }

    if (item.type === 'page') {
      const data = item.data as PassiveCollectPageData
      if (!data.asin || !data.marketplace || !data.title) {
        totalErrors.push({ asin: data.asin ?? 'unknown', error: 'Missing required fields' })
        continue
      }
      const result = await processPageItem(supabase, req, data, user.id)
      if (result === 'created') totalCreated++
      else if (result === 'duplicate') totalDuplicates++
      else totalErrors.push({ asin: data.asin, error: result.error })
    } else if (item.type === 'search') {
      const data = item.data as PassiveCollectSearchData
      if (!data.search_term || !data.marketplace || !data.items?.length) {
        totalErrors.push({ asin: 'search', error: 'Missing required fields' })
        continue
      }
      const result = await processSearchItem(supabase, req, data, user.id)
      totalCreated += result.created
      totalDuplicates += result.duplicates
      totalErrors.push(...result.errors)
    }
  }

  return NextResponse.json({
    created: totalCreated,
    duplicates: totalDuplicates,
    errors: totalErrors,
  })
}, ['owner', 'admin', 'editor', 'viewer_plus', 'viewer'])
