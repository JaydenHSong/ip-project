import type { SupabaseClient } from '@supabase/supabase-js'
import { checkSuspectListing } from '@/lib/utils/suspect-filter'

type FetchedPageData = {
  asin: string
  title: string
  description?: string | null
  bullet_points?: string[]
  images?: string[] | { url: string; position: number; alt?: string }[]
  price_amount?: number | null
  price_currency?: string
  seller_name?: string | null
  seller_id?: string | null
  brand?: string | null
  category?: string | null
  rating?: number | null
  review_count?: number | null
  url?: string
}

type CreateListingParams = {
  pageData: FetchedPageData
  marketplace: string
  userId: string
  screenshotUrl?: string | null
  source: 'manual' | 'extension'
  supabase: SupabaseClient
}

type CreateListingResult = {
  listing: Record<string, unknown>
  isExisting: boolean
}

export const createListingFromFetch = async ({
  pageData,
  marketplace,
  userId,
  screenshotUrl,
  source,
  supabase,
}: CreateListingParams): Promise<CreateListingResult> => {
  const asin = pageData.asin

  // Check existing
  const { data: existing } = await supabase
    .from('listings')
    .select('*')
    .eq('asin', asin)
    .eq('marketplace', marketplace)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (existing) {
    return { listing: existing, isExisting: true }
  }

  // Normalize images
  const images = (pageData.images ?? []).map((img, i) => {
    if (typeof img === 'string') {
      return { url: img, position: i }
    }
    return img
  })

  // Suspect check
  const { is_suspect, suspect_reasons } = checkSuspectListing({
    title: pageData.title,
    description: pageData.description,
    bullet_points: pageData.bullet_points,
    brand: pageData.brand,
    seller_name: pageData.seller_name,
  })

  const { data: listing, error: insertError } = await supabase
    .from('listings')
    .insert({
      asin,
      marketplace,
      title: pageData.title,
      description: pageData.description ?? null,
      bullet_points: pageData.bullet_points ?? [],
      images,
      price_amount: pageData.price_amount ?? null,
      price_currency: pageData.price_currency ?? 'USD',
      seller_name: pageData.seller_name ?? null,
      seller_id: pageData.seller_id ?? null,
      brand: pageData.brand ?? null,
      category: pageData.category ?? null,
      rating: pageData.rating ?? null,
      review_count: pageData.review_count ?? null,
      is_suspect,
      suspect_reasons,
      source,
      source_user_id: userId,
      screenshot_url: screenshotUrl ?? null,
    })
    .select('*')
    .single()

  if (insertError || !listing) {
    throw new Error(insertError?.message ?? 'Failed to create listing')
  }

  return { listing, isExisting: false }
}
