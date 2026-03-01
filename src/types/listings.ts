export type ListingImage = {
  url: string
  position: number
  alt: string | null
}

export type ListingSource = 'crawler' | 'extension'

export type Listing = {
  id: string
  asin: string
  marketplace: string
  title: string | null
  description: string | null
  bullet_points: string[]
  images: ListingImage[]
  price_amount: number | null
  price_currency: string
  seller_name: string | null
  seller_id: string | null
  brand: string | null
  category: string | null
  rating: number | null
  review_count: number | null
  is_suspect: boolean
  suspect_reasons: string[]
  source: ListingSource
  source_campaign_id: string | null
  source_user_id: string | null
  raw_data: unknown
  crawled_at: string
  created_at: string
  updated_at: string
}
