import type {
  Campaign,
  CrawlerListingRequest,
  CrawlerListingResponse,
  CrawlerBatchResponse,
} from '../types/index.js'
import { log } from '../logger.js'

type SentinelClient = {
  getActiveCampaigns: () => Promise<Campaign[]>
  submitListing: (data: CrawlerListingRequest) => Promise<CrawlerListingResponse>
  submitBatch: (listings: CrawlerListingRequest[]) => Promise<CrawlerBatchResponse>
}

const API_RETRY_MAX = 3
const API_RETRY_DELAY = 5_000

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

const fetchWithRetry = async (
  url: string,
  options: RequestInit,
  retries: number = API_RETRY_MAX,
): Promise<Response> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options)

      // 409 중복은 재시도하지 않음
      if (response.status === 409) return response
      // 4xx 에러는 재시도하지 않음
      if (response.status >= 400 && response.status < 500) return response

      // 5xx 에러는 재시도
      if (response.status >= 500 && attempt < retries) {
        log('warn', 'api-client', `API returned ${response.status}, retrying (${attempt}/${retries})`)
        await sleep(API_RETRY_DELAY * attempt)
        continue
      }

      return response
    } catch (error) {
      if (attempt < retries) {
        log('warn', 'api-client', `Network error, retrying (${attempt}/${retries})`, {
          error: error instanceof Error ? error.message : String(error),
        })
        await sleep(API_RETRY_DELAY * attempt)
        continue
      }
      throw error
    }
  }

  throw new Error('Max retries exceeded')
}

const createSentinelClient = (apiUrl: string, serviceToken: string): SentinelClient => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${serviceToken}`,
  }

  const baseUrl = apiUrl.replace(/\/$/, '')

  return {
    getActiveCampaigns: async (): Promise<Campaign[]> => {
      log('info', 'api-client', 'Fetching active campaigns')

      const response = await fetchWithRetry(
        `${baseUrl}/api/crawler/campaigns`,
        { method: 'GET', headers },
      )

      if (!response.ok) {
        const body = await response.text()
        throw new Error(`Failed to fetch campaigns: ${response.status} ${body}`)
      }

      const data = (await response.json()) as { campaigns: Campaign[] }
      log('info', 'api-client', `Fetched ${data.campaigns.length} active campaigns`)
      return data.campaigns
    },

    submitListing: async (listing: CrawlerListingRequest): Promise<CrawlerListingResponse> => {
      const response = await fetchWithRetry(
        `${baseUrl}/api/crawler/listings`,
        { method: 'POST', headers, body: JSON.stringify(listing) },
      )

      if (response.status === 409) {
        throw new Error('API_DUPLICATE')
      }

      if (!response.ok) {
        const body = await response.text()
        throw new Error(`Failed to submit listing: ${response.status} ${body}`)
      }

      return (await response.json()) as CrawlerListingResponse
    },

    submitBatch: async (listings: CrawlerListingRequest[]): Promise<CrawlerBatchResponse> => {
      log('info', 'api-client', `Submitting batch of ${listings.length} listings`)

      const response = await fetchWithRetry(
        `${baseUrl}/api/crawler/listings/batch`,
        { method: 'POST', headers, body: JSON.stringify({ listings }) },
      )

      if (!response.ok) {
        const body = await response.text()
        throw new Error(`Failed to submit batch: ${response.status} ${body}`)
      }

      const result = (await response.json()) as CrawlerBatchResponse
      log('info', 'api-client', `Batch result — created: ${result.created}, duplicates: ${result.duplicates}, errors: ${result.errors.length}`)
      return result
    },
  }
}

export { createSentinelClient }
export type { SentinelClient }
