// Design Ref: §3.3 + §5.3 — Amazon Marketing Stream adapter (implements StreamPort)

import crypto from 'crypto'
import { adsConfig } from '../infra/api-config'
import type { StreamPort, StreamMetricBatch, StreamMetric, ProcessResult } from '../ports/stream-port'

export class AmazonStreamAdapter implements StreamPort {
  validateSignature(payload: string, signature: string): boolean {
    const secret = adsConfig.stream.secret
    if (!secret) return false

    const expected = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')

    return crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(signature, 'hex'),
    )
  }

  parseMetrics(payload: unknown): StreamMetricBatch {
    const raw = payload as Record<string, unknown>
    const profileId = String(raw.profileId ?? raw.profile_id ?? '')
    const datasetId = String(raw.datasetId ?? raw.dataset_id ?? '')
    const records = (raw.records ?? raw.metrics ?? []) as Array<Record<string, unknown>>

    const metrics: StreamMetric[] = records.map(r => ({
      campaign_id: String(r.campaignId ?? r.campaign_id ?? ''),
      ad_group_id: r.adGroupId ? String(r.adGroupId) : r.ad_group_id ? String(r.ad_group_id) : undefined,
      keyword_id: r.keywordId ? String(r.keywordId) : r.keyword_id ? String(r.keyword_id) : undefined,
      date: String(r.date ?? new Date().toISOString().split('T')[0]),
      hour: Number(r.hour ?? 0),
      impressions: Number(r.impressions ?? 0),
      clicks: Number(r.clicks ?? 0),
      cost: Number(r.cost ?? 0),
      sales: Number(r.sales ?? 0),
      orders: Number(r.orders ?? 0),
    }))

    return { profile_id: profileId, dataset_id: datasetId, metrics }
  }

  async processMetrics(_batch: StreamMetricBatch): Promise<ProcessResult> {
    // Processing delegated to StreamService — adapter only handles parse + validate
    throw new Error('Use StreamService.processMetrics() instead')
  }
}
