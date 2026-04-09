// Design Ref: §3.6 P5 — Report request + download operations

import { AmazonApiError } from './amazon-ads-adapter'
import type { DateRange, SearchTermRow } from '../ports/ads-port'
import type { AmazonReportMetrics } from '../types'

type RequestFn = <T>(method: string, path: string, body?: unknown, extraHeaders?: Record<string, string>) => Promise<T>

export async function requestReportImpl(
  request: RequestFn, reportType: string, dateRange: DateRange,
): Promise<string> {
  try {
    const reportTypeMap: Record<string, string> = {
      sp_campaigns: 'spCampaigns',
      sp_targeting: 'spTargeting',
      sp_search_term: 'spSearchTerm',
      sp_advertised_product: 'spAdvertisedProduct',
    }
    const amazonReportType = reportTypeMap[reportType] ?? reportType

    const data = await request<{ reportId: string }>(
      'POST', '/reporting/reports',
      {
        name: `ARC ${amazonReportType} ${dateRange.start}`,
        startDate: dateRange.start,
        endDate: dateRange.end,
        configuration: {
          adProduct: 'SPONSORED_PRODUCTS',
          groupBy: ['campaign'],
          columns: ['impressions', 'clicks', 'cost', 'purchases1d', 'sales1d', 'campaignId', 'date'],
          reportTypeId: amazonReportType,
          timeUnit: 'DAILY',
          format: 'GZIP_JSON',
        },
      },
      { 'Content-Type': 'application/vnd.createasyncreportrequest.v3+json' },
    )
    return data.reportId
  } catch (e) { throw new AmazonApiError('requestReport', e) }
}

function parseMetricsRow(r: Record<string, unknown>): AmazonReportMetrics {
  const cost = Number(r.cost ?? 0)
  const sales = Number(r.sales1d ?? 0)
  const clicks = Number(r.clicks ?? 0)
  const impressions = Number(r.impressions ?? 0)
  const orders = Number(r.purchases1d ?? 0)

  return {
    campaign_id: String(r.campaignId ?? ''),
    impressions, clicks, cost, sales, orders,
    acos: cost > 0 && sales > 0 ? Number(((cost / sales) * 100).toFixed(2)) : 0,
    roas: cost > 0 ? Number((sales / cost).toFixed(2)) : 0,
    ctr: impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0,
    cpc: clicks > 0 ? Number((cost / clicks).toFixed(2)) : 0,
    conversion_rate: clicks > 0 ? Number(((orders / clicks) * 100).toFixed(2)) : 0,
    date: String(r.date ?? ''),
  }
}

export async function downloadReportImpl(
  request: RequestFn, reportId: string,
): Promise<AmazonReportMetrics[]> {
  try {
    type ReportStatus = { reportId: string; status: string; url?: string }
    const v3Header = { 'Content-Type': 'application/vnd.createasyncreportrequest.v3+json' }

    for (let attempt = 0; attempt < 80; attempt++) {
      const status = await request<ReportStatus>('GET', `/reporting/reports/${reportId}`, undefined, v3Header)
      if (status.status === 'COMPLETED' && status.url) {
        const { gunzipSync } = await import('node:zlib')
        const res = await fetch(status.url)
        const buffer = Buffer.from(await res.arrayBuffer())
        const decompressed = gunzipSync(buffer)
        const rows = JSON.parse(decompressed.toString()) as Array<Record<string, unknown>>
        return rows.map(parseMetricsRow)
      }
      if (status.status === 'FAILURE') throw new Error(`Report ${reportId} failed`)
      await new Promise(resolve => setTimeout(resolve, 15000))
    }
    throw new Error(`Report ${reportId} timed out after 20min`)
  } catch (e) {
    if (e instanceof AmazonApiError) throw e
    throw new AmazonApiError('downloadReport', e)
  }
}

export async function getSearchTermReportImpl(
  request: RequestFn, campaignId: string, dateRange: DateRange,
): Promise<SearchTermRow[]> {
  try {
    const reportId = await request<{ reportId: string }>(
      'POST', '/reporting/reports',
      {
        reportDate: dateRange.start,
        configuration: {
          adProduct: 'SPONSORED_PRODUCTS',
          groupBy: ['searchTerm'],
          columns: ['searchTerm', 'campaignId', 'adGroupId', 'impressions', 'clicks', 'cost', 'purchases1d', 'sales1d'],
          reportTypeId: 'spSearchTerm',
          timeUnit: 'DAILY',
          format: 'GZIP_JSON',
          filters: [{ field: 'campaignId', values: [campaignId] }],
        },
      },
    )

    for (let attempt = 0; attempt < 10; attempt++) {
      const status = await request<{ status: string; url?: string }>('GET', `/reporting/reports/${reportId.reportId}`)
      if (status.status === 'COMPLETED' && status.url) {
        const res = await fetch(status.url)
        const rows = await res.json() as Array<Record<string, unknown>>
        return rows.map(r => ({
          search_term: String(r.searchTerm ?? ''),
          campaign_id: String(r.campaignId ?? campaignId),
          ad_group_id: String(r.adGroupId ?? ''),
          impressions: Number(r.impressions ?? 0),
          clicks: Number(r.clicks ?? 0),
          cost: Number(r.cost ?? 0),
          sales: Number(r.sales1d ?? 0),
          orders: Number(r.purchases1d ?? 0),
          acos: Number(r.cost ?? 0) > 0 && Number(r.sales1d ?? 0) > 0
            ? Number(((Number(r.cost) / Number(r.sales1d)) * 100).toFixed(2))
            : 0,
        }))
      }
      if (status.status === 'FAILURE') throw new Error('Search term report failed')
      await new Promise(resolve => setTimeout(resolve, 3000))
    }
    throw new Error('Search term report timed out')
  } catch (e) {
    if (e instanceof AmazonApiError) throw e
    throw new AmazonApiError('getSearchTermReport', e)
  }
}
