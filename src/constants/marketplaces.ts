// 지원 마켓플레이스 (D29: US만 P0, 나머지 MS3 확장)

export const MARKETPLACES = {
  US: { code: 'US', name: 'United States', domain: 'amazon.com', currency: 'USD' },
  UK: { code: 'UK', name: 'United Kingdom', domain: 'amazon.co.uk', currency: 'GBP' },
  JP: { code: 'JP', name: 'Japan', domain: 'amazon.co.jp', currency: 'JPY' },
  DE: { code: 'DE', name: 'Germany', domain: 'amazon.de', currency: 'EUR' },
  FR: { code: 'FR', name: 'France', domain: 'amazon.fr', currency: 'EUR' },
  IT: { code: 'IT', name: 'Italy', domain: 'amazon.it', currency: 'EUR' },
  ES: { code: 'ES', name: 'Spain', domain: 'amazon.es', currency: 'EUR' },
  CA: { code: 'CA', name: 'Canada', domain: 'amazon.ca', currency: 'CAD' },
  AU: { code: 'AU', name: 'Australia', domain: 'amazon.com.au', currency: 'AUD' },
} as const

export type MarketplaceCode = keyof typeof MARKETPLACES

export const MARKETPLACE_CODES = Object.keys(MARKETPLACES) as MarketplaceCode[]

export const DEFAULT_MARKETPLACE: MarketplaceCode = 'US'
