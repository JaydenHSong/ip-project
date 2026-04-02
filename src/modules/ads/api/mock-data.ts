// Design Ref: §8.2 — Realistic mock data generator
// Plan SC: SC-08 Mock 데이터 현실적 (50 campaigns, 500 keywords, 30d metrics)

import type {
  AmazonCampaign,
  AmazonAdGroup,
  AmazonKeyword,
  AmazonReportMetrics,
  AmazonProfile,
  AmazonOrder,
  AmazonBrandAnalyticsRow,
} from './types'

// ─── Seed data ───

const BRANDS = ['Spigen', 'Caseology', 'Cyrill', 'Legato']
const MARKETS = [{ code: 'US', id: 'ATVPDKIKX0DER', currency: 'USD' }]
const PRODUCTS = [
  'iPhone 16 Pro Max Case', 'iPhone 16 Pro Case', 'iPhone 16 Case',
  'Galaxy S26 Ultra Case', 'Galaxy S26 Case', 'Galaxy S25 FE Case',
  'Pixel 10 Pro Case', 'iPad Air Case', 'MacBook Pro Sleeve',
  'AirTag Case', 'Apple Watch Band', 'MagSafe Charger Stand',
]
const CAMPAIGN_TYPES: AmazonCampaign['campaign_type'][] = ['sp', 'sb', 'sd']
const MATCH_TYPES: AmazonKeyword['match_type'][] = ['broad', 'phrase', 'exact']
const SEARCH_TERMS = [
  'iphone 16 pro max case', 'spigen case', 'clear phone case', 'magsafe case',
  'galaxy s26 ultra case', 'thin phone case', 'drop protection case',
  'pixel 10 case', 'ipad case with pencil holder', 'macbook sleeve 14 inch',
  'phone case with kickstand', 'wireless charger', 'apple watch band 45mm',
  'airtag holder keychain', 'screen protector iphone 16', 'military grade case',
  'leather phone case', 'wallet phone case', 'cute phone case', 'rugged phone case',
]

let _seed = 42
function seededRandom(): number {
  _seed = (_seed * 16807) % 2147483647
  return (_seed - 1) / 2147483646
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(seededRandom() * arr.length)]
}

function randomBetween(min: number, max: number): number {
  return min + seededRandom() * (max - min)
}

// ─── Generators ───

export function generateMockProfiles(): AmazonProfile[] {
  return MARKETS.map(m => ({
    profile_id: `mock-profile-${m.code.toLowerCase()}`,
    country_code: m.code,
    currency_code: m.currency,
    marketplace_id: m.id,
    account_type: 'seller' as const,
  }))
}

export function generateMockCampaigns(count = 50): AmazonCampaign[] {
  _seed = 42
  return Array.from({ length: count }, (_, i) => {
    const brand = pick(BRANDS)
    const product = pick(PRODUCTS)
    const type = pick(CAMPAIGN_TYPES)
    const isActive = seededRandom() > 0.15
    return {
      campaign_id: `mock-camp-${String(i + 1).padStart(4, '0')}`,
      name: `${brand} | ${type.toUpperCase()} | ${product}`,
      campaign_type: type,
      state: isActive ? 'enabled' as const : 'paused' as const,
      budget: Math.round(randomBetween(20, 500)),
      budget_type: 'daily' as const,
      start_date: '2026-01-15',
      targeting_type: seededRandom() > 0.3 ? 'manual' as const : 'auto' as const,
      bidding_strategy: 'dynamic_bids_down',
    }
  })
}

export function generateMockAdGroups(campaigns: AmazonCampaign[]): AmazonAdGroup[] {
  const groups: AmazonAdGroup[] = []
  for (const camp of campaigns) {
    const count = Math.floor(randomBetween(2, 5))
    for (let j = 0; j < count; j++) {
      groups.push({
        ad_group_id: `mock-ag-${camp.campaign_id}-${j}`,
        campaign_id: camp.campaign_id,
        name: `${camp.name.split('|')[2]?.trim() ?? 'Default'} - Group ${j + 1}`,
        state: camp.state,
        default_bid: Number(randomBetween(0.5, 5.0).toFixed(2)),
      })
    }
  }
  return groups
}

export function generateMockKeywords(adGroups: AmazonAdGroup[], count = 500): AmazonKeyword[] {
  _seed = 100
  return Array.from({ length: count }, (_, i) => {
    const ag = pick(adGroups)
    return {
      keyword_id: `mock-kw-${String(i + 1).padStart(5, '0')}`,
      ad_group_id: ag.ad_group_id,
      campaign_id: ag.campaign_id,
      keyword_text: pick(SEARCH_TERMS),
      match_type: pick(MATCH_TYPES),
      state: seededRandom() > 0.1 ? 'enabled' as const : 'paused' as const,
      bid: Number(randomBetween(0.3, 8.0).toFixed(2)),
    }
  })
}

export function generateMockMetrics(campaigns: AmazonCampaign[], days = 30): AmazonReportMetrics[] {
  _seed = 200
  const metrics: AmazonReportMetrics[] = []
  const today = new Date()

  for (const camp of campaigns) {
    if (camp.state !== 'enabled') continue
    for (let d = 0; d < days; d++) {
      const date = new Date(today)
      date.setDate(date.getDate() - d)
      const dateStr = date.toISOString().split('T')[0]

      const impressions = Math.round(randomBetween(500, 20000))
      const ctr = randomBetween(0.002, 0.08)
      const clicks = Math.round(impressions * ctr)
      const cpc = randomBetween(0.3, 3.0)
      const cost = Number((clicks * cpc).toFixed(2))
      const convRate = randomBetween(0.05, 0.25)
      const orders = Math.round(clicks * convRate)
      const avgOrderValue = randomBetween(15, 45)
      const sales = Number((orders * avgOrderValue).toFixed(2))
      const acos = sales > 0 ? Number(((cost / sales) * 100).toFixed(2)) : 0
      const roas = cost > 0 ? Number((sales / cost).toFixed(2)) : 0

      metrics.push({
        campaign_id: camp.campaign_id,
        impressions, clicks, cost, sales, orders, acos, roas,
        ctr: Number((ctr * 100).toFixed(2)),
        cpc: Number(cpc.toFixed(2)),
        conversion_rate: Number((convRate * 100).toFixed(2)),
        date: dateStr,
      })
    }
  }
  return metrics
}

export function generateMockOrders(count = 200): AmazonOrder[] {
  _seed = 300
  const orders: AmazonOrder[] = []
  const today = new Date()

  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor(randomBetween(0, 30))
    const hour = Math.floor(randomBetween(0, 24))
    const date = new Date(today)
    date.setDate(date.getDate() - daysAgo)
    date.setHours(hour, Math.floor(randomBetween(0, 60)))

    orders.push({
      amazon_order_id: `mock-order-${String(i + 1).padStart(6, '0')}`,
      purchase_date: date.toISOString(),
      order_status: 'Shipped',
      order_total: {
        currency_code: 'USD',
        amount: randomBetween(12, 55).toFixed(2),
      },
      marketplace_id: 'ATVPDKIKX0DER',
    })
  }
  return orders
}

export function generateMockBrandAnalytics(count = 30): AmazonBrandAnalyticsRow[] {
  _seed = 400
  return SEARCH_TERMS.slice(0, count).map((term, i) => ({
    search_term: term,
    search_frequency_rank: i + 1,
    click_share: Number(randomBetween(1, 15).toFixed(1)),
    conversion_share: Number(randomBetween(2, 20).toFixed(1)),
    asin_1: `B0${String(Math.floor(randomBetween(10000, 99999))).padStart(5, '0')}`,
    asin_1_click_share: Number(randomBetween(5, 30).toFixed(1)),
    asin_1_conversion_share: Number(randomBetween(5, 35).toFixed(1)),
  }))
}
