import Anthropic from '@anthropic-ai/sdk'
import { log } from '../logger.js'
import {
  PAGE_STATUS_PROMPT,
  SEARCH_RESULTS_PROMPT,
  DETAIL_PAGE_PROMPT,
  FIND_SEARCH_BAR_PROMPT,
  FIND_NEXT_BUTTON_PROMPT,
  THUMBNAIL_SCAN_PROMPT,
  VIOLATION_SCAN_PROMPT,
} from './prompts.js'

type PageStatus = {
  status: 'normal' | 'captcha' | 'bot_detection' | 'not_found' | 'error' | 'empty'
  description: string
  recommendation: 'proceed' | 'retry_proxy' | 'retry_delay' | 'skip'
}

type AiSearchResult = {
  page_status: 'normal' | 'no_results' | 'captcha' | 'blocked'
  has_next_page: boolean
  products: {
    asin: string | null
    title: string
    price: string | null
    is_sponsored: boolean
    position: number
  }[]
}

type AiDetailResult = {
  page_status: 'normal' | 'captcha' | 'not_found' | 'blocked'
  title: string
  brand: string | null
  price_amount: number | null
  price_currency: string
  seller_name: string | null
  rating: number | null
  review_count: number | null
  bullet_points: string[]
  description_summary: string | null
  has_images: boolean
  image_count: number
}

type ElementLocation = {
  found: boolean
  description: string
  approximate_location: {
    x_percent: number
    y_percent: number
  }
}

type ThumbnailScanResult = {
  violations: { asin: string; reason: string }[]
}

type ViolationScanResult = {
  is_violation: boolean
  violation_types: string[]
  confidence: number
  reasons: string[]
  evidence_summary: string
}

type VisionAnalyzer = {
  analyzePageStatus: (screenshotBase64: string) => Promise<PageStatus>
  analyzeSearchResults: (screenshotBase64: string) => Promise<AiSearchResult>
  analyzeDetailPage: (screenshotBase64: string) => Promise<AiDetailResult>
  findSearchBar: (screenshotBase64: string) => Promise<ElementLocation>
  findNextButton: (screenshotBase64: string) => Promise<ElementLocation & { has_next: boolean }>
  scanThumbnails: (screenshotBase64: string) => Promise<ThumbnailScanResult>
  scanViolation: (screenshotBase64: string, listingData: string) => Promise<ViolationScanResult>
}

const parseJsonResponse = <T>(text: string): T => {
  // Claude가 ```json ... ``` 로 감쌀 수 있으므로 추출
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error(`No JSON found in response: ${text.slice(0, 200)}`)
  }
  return JSON.parse(jsonMatch[0]) as T
}

const createVisionAnalyzer = (apiKey: string, model?: string): VisionAnalyzer => {
  const client = new Anthropic({ apiKey })
  const visionModel = model ?? 'claude-haiku-4-5-20251001'

  const callVision = async <T>(
    screenshotBase64: string,
    prompt: string,
    label: string,
  ): Promise<T> => {
    const startTime = Date.now()

    try {
      const response = await client.messages.create({
        model: visionModel,
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: screenshotBase64,
                },
              },
              { type: 'text', text: prompt },
            ],
          },
        ],
      })

      const textBlock = response.content.find((b) => b.type === 'text')
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('No text response from Claude')
      }

      const result = parseJsonResponse<T>(textBlock.text)
      const duration = Date.now() - startTime
      log('info', 'vision', `${label} completed in ${duration}ms`)
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      const msg = error instanceof Error ? error.message : String(error)
      log('error', 'vision', `${label} failed after ${duration}ms: ${msg}`)
      throw error
    }
  }

  return {
    analyzePageStatus: (screenshotBase64) =>
      callVision<PageStatus>(screenshotBase64, PAGE_STATUS_PROMPT, 'Page status analysis'),

    analyzeSearchResults: (screenshotBase64) =>
      callVision<AiSearchResult>(screenshotBase64, SEARCH_RESULTS_PROMPT, 'Search results analysis'),

    analyzeDetailPage: (screenshotBase64) =>
      callVision<AiDetailResult>(screenshotBase64, DETAIL_PAGE_PROMPT, 'Detail page analysis'),

    findSearchBar: (screenshotBase64) =>
      callVision<ElementLocation>(screenshotBase64, FIND_SEARCH_BAR_PROMPT, 'Find search bar'),

    findNextButton: (screenshotBase64) =>
      callVision<ElementLocation & { has_next: boolean }>(screenshotBase64, FIND_NEXT_BUTTON_PROMPT, 'Find next button'),

    scanThumbnails: (screenshotBase64) =>
      callVision<ThumbnailScanResult>(screenshotBase64, THUMBNAIL_SCAN_PROMPT, 'Thumbnail scan'),

    scanViolation: async (screenshotBase64, listingData) => {
      const prompt = VIOLATION_SCAN_PROMPT.replace('{{LISTING_DATA}}', listingData)
      return callVision<ViolationScanResult>(screenshotBase64, prompt, 'Violation scan')
    },
  }
}

export { createVisionAnalyzer }
export type { VisionAnalyzer, PageStatus, AiSearchResult, AiDetailResult, ElementLocation, ThumbnailScanResult, ViolationScanResult }
