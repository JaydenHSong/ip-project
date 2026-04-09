// Design Ref: §3.6 P5 — Keyword resource operations

import { AmazonApiError } from './amazon-ads-adapter'
import type { AmazonKeyword, AmazonPaginatedResponse } from '../types'

function mapState(s: string): 'enabled' | 'paused' | 'archived' {
  const lower = s.toLowerCase()
  if (lower === 'enabled') return 'enabled'
  if (lower === 'paused') return 'paused'
  return 'archived'
}

function mapMatchType(m: string): 'broad' | 'phrase' | 'exact' {
  const lower = m.toLowerCase()
  if (lower === 'broad') return 'broad'
  if (lower === 'phrase') return 'phrase'
  return 'exact'
}

type RequestFn = <T>(method: string, path: string, body?: unknown, extraHeaders?: Record<string, string>) => Promise<T>
const KW_HDR = { 'Content-Type': 'application/vnd.spKeyword.v3+json', 'Accept': 'application/vnd.spKeyword.v3+json' }

export async function listKeywordsImpl(
  request: RequestFn, adGroupId: string,
): Promise<AmazonPaginatedResponse<AmazonKeyword>> {
  try {
    type V3KeywordResponse = {
      keywords: Array<{
        keywordId: string; adGroupId: string; campaignId: string
        keywordText: string; matchType: string; state: string; bid: number
      }>
      totalResults?: number
    }

    const data = await request<V3KeywordResponse>(
      'POST', '/sp/keywords/list',
      { adGroupIdFilter: { include: [adGroupId] }, maxResults: 100 }, KW_HDR,
    )

    return {
      data: data.keywords.map(kw => ({
        keyword_id: kw.keywordId, ad_group_id: kw.adGroupId, campaign_id: kw.campaignId,
        keyword_text: kw.keywordText, match_type: mapMatchType(kw.matchType),
        state: mapState(kw.state), bid: kw.bid,
      })),
      total_count: data.totalResults,
    }
  } catch (e) { throw new AmazonApiError('listKeywords', e) }
}

export async function updateKeywordBidImpl(
  request: RequestFn, keywordId: string, bid: number,
): Promise<AmazonKeyword> {
  try {
    await request('PUT', '/sp/keywords', { keywords: [{ keywordId, bid }] }, KW_HDR)
    return { keyword_id: keywordId, bid } as AmazonKeyword
  } catch (e) { throw new AmazonApiError('updateKeywordBid', e) }
}

export async function createKeywordsImpl(
  request: RequestFn, keywords: Partial<AmazonKeyword>[],
): Promise<AmazonKeyword[]> {
  try {
    const body = keywords.map(kw => ({
      campaignId: kw.campaign_id,
      adGroupId: kw.ad_group_id,
      keywordText: kw.keyword_text,
      matchType: (kw.match_type ?? 'exact').toUpperCase(),
      bid: kw.bid ?? 1.0,
      state: 'ENABLED',
    }))

    const data = await request<{ keywords: Array<{ keywordId: string; index: number }> }>(
      'POST', '/sp/keywords', { keywords: body }, KW_HDR,
    )

    return data.keywords.map((res, i) => ({
      keyword_id: res.keywordId,
      ad_group_id: keywords[i].ad_group_id ?? '',
      campaign_id: keywords[i].campaign_id ?? '',
      keyword_text: keywords[i].keyword_text ?? '',
      match_type: keywords[i].match_type ?? 'exact' as const,
      state: 'enabled' as const,
      bid: keywords[i].bid ?? 1.0,
    }))
  } catch (e) { throw new AmazonApiError('createKeywords', e) }
}

export async function archiveKeywordImpl(
  request: RequestFn, keywordId: string,
): Promise<void> {
  try {
    await request('PUT', '/sp/keywords', { keywords: [{ keywordId, state: 'ARCHIVED' }] }, KW_HDR)
  } catch (e) { throw new AmazonApiError('archiveKeyword', e) }
}
