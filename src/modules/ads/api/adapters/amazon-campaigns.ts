// Design Ref: §3.6 P5 — Campaign + AdGroup resource operations

import { AmazonApiError } from './amazon-ads-adapter'
import type {
  AmazonCampaign, AmazonAdGroup,
  AmazonPaginatedResponse,
} from '../types'

function mapState(s: string): 'enabled' | 'paused' | 'archived' {
  const lower = s.toLowerCase()
  if (lower === 'enabled') return 'enabled'
  if (lower === 'paused') return 'paused'
  return 'archived'
}

type RequestFn = <T>(method: string, path: string, body?: unknown, extraHeaders?: Record<string, string>) => Promise<T>

export async function listCampaignsImpl(
  request: RequestFn, nextToken?: string,
): Promise<AmazonPaginatedResponse<AmazonCampaign>> {
  try {
    type V3CampaignResponse = {
      campaigns: Array<{
        campaignId: string; name: string; campaignType?: string; state: string
        budget: { budget: number; budgetType: string }; startDate: string; endDate?: string
        targetingType?: string; dynamicBidding?: { strategy: string }
      }>
      nextToken?: string; totalResults?: number
    }

    const body: Record<string, unknown> = { maxResults: 100 }
    if (nextToken) body.nextToken = nextToken
    const hdr = { 'Content-Type': 'application/vnd.spCampaign.v3+json', 'Accept': 'application/vnd.spCampaign.v3+json' }

    const data = await request<V3CampaignResponse>('POST', '/sp/campaigns/list', body, hdr)

    return {
      data: data.campaigns.map(c => ({
        campaign_id: c.campaignId, name: c.name, campaign_type: 'sp' as const,
        state: mapState(c.state), budget: c.budget.budget,
        budget_type: c.budget.budgetType === 'DAILY' ? 'daily' as const : 'lifetime' as const,
        start_date: c.startDate, end_date: c.endDate,
        targeting_type: c.targetingType === 'MANUAL' ? 'manual' as const : 'auto' as const,
        bidding_strategy: c.dynamicBidding?.strategy,
      })),
      next_token: data.nextToken,
      total_count: data.totalResults,
    }
  } catch (e) { throw new AmazonApiError('listCampaigns', e) }
}

export async function listAdGroupsImpl(
  request: RequestFn, campaignId: string,
): Promise<AmazonPaginatedResponse<AmazonAdGroup>> {
  try {
    type V3AdGroupResponse = {
      adGroups: Array<{ adGroupId: string; campaignId: string; name: string; state: string; defaultBid: number }>
      totalResults?: number
    }

    const hdr = { 'Content-Type': 'application/vnd.spAdGroup.v3+json', 'Accept': 'application/vnd.spAdGroup.v3+json' }
    const data = await request<V3AdGroupResponse>(
      'POST', '/sp/adGroups/list',
      { campaignIdFilter: { include: [campaignId] }, maxResults: 100 }, hdr,
    )

    return {
      data: data.adGroups.map(ag => ({
        ad_group_id: ag.adGroupId, campaign_id: ag.campaignId,
        name: ag.name, state: mapState(ag.state), default_bid: ag.defaultBid,
      })),
      total_count: data.totalResults,
    }
  } catch (e) { throw new AmazonApiError('listAdGroups', e) }
}

export async function updateCampaignImpl(
  request: RequestFn, campaignId: string, updates: Partial<AmazonCampaign>,
): Promise<AmazonCampaign> {
  try {
    type V3UpdateBody = { campaignId: string; state?: string; budget?: { budget: number; budgetType: string }; name?: string }
    const body: V3UpdateBody = { campaignId }
    if (updates.state) body.state = updates.state.toUpperCase()
    if (updates.budget) body.budget = { budget: updates.budget, budgetType: (updates.budget_type ?? 'daily').toUpperCase() }
    if (updates.name) body.name = updates.name

    const hdr = { 'Content-Type': 'application/vnd.spCampaign.v3+json', 'Accept': 'application/vnd.spCampaign.v3+json' }
    await request<{ campaigns: Array<{ campaignId: string; index: number }> }>('PUT', '/sp/campaigns', { campaigns: [body] }, hdr)
    return { ...updates, campaign_id: campaignId } as AmazonCampaign
  } catch (e) { throw new AmazonApiError('updateCampaign', e) }
}
