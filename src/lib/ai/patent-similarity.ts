// 특허 유사도 분석 — Sonnet Vision
// 리스팅 이미지/기능 vs 특허 이미지/키워드 비교 (V03)

import type { Listing } from '@/types/listings'
import type { Patent } from '@/types/patents'
import { MODEL_ROLES, type ClaudeClient, type PatentSimilarityResult } from '@/types/ai'

const PATENT_SIMILARITY_PROMPT = `Compare the following product listing with Spigen's patent.

## Product Listing
- Title: {{title}}
- Brand: {{brand}}
- Description: {{description}}

## Patent Information
- Patent Number: {{patentNumber}}
- Patent Name: {{patentName}}
- Country: {{country}}
- Keywords: {{keywords}}

## Instructions
1. For design patents: Compare visual appearance (shape, proportions, surface decoration)
2. For utility patents: Compare functional features described in keywords
3. Score similarity from 0-100:
   - 90-100: Nearly identical, clear infringement
   - 70-89: Significant similarities, likely infringement
   - 50-69: Some similarities, possible infringement
   - 30-49: Minor similarities, unlikely infringement
   - 0-29: No meaningful similarity

## Response Format (JSON only)
{
  "similarity_score": 75,
  "matched_features": ["Case shape matches patent design", "Camera cutout pattern similar"],
  "reasoning": "The product shows significant visual similarity to the patented design..."
}`

const buildPatentPrompt = (listing: Listing, patent: Patent): string => {
  return PATENT_SIMILARITY_PROMPT
    .replace('{{title}}', listing.title ?? '(unknown)')
    .replace('{{brand}}', listing.brand ?? '(unknown)')
    .replace('{{description}}', listing.description ?? '(none)')
    .replace('{{patentNumber}}', patent.management_number)
    .replace('{{patentName}}', patent.name)
    .replace('{{country}}', patent.country)
    .replace('{{keywords}}', patent.keywords.join(', ') || '(none)')
}

const parsePatentResponse = (raw: string, patent: Patent): PatentSimilarityResult => {
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return {
      patentId: patent.id,
      patentNumber: patent.management_number,
      similarityScore: 0,
      matchedFeatures: [],
      reasoning: 'Failed to parse response',
    }
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      similarity_score?: number
      matched_features?: string[]
      reasoning?: string
    }

    return {
      patentId: patent.id,
      patentNumber: patent.management_number,
      similarityScore: parsed.similarity_score ?? 0,
      matchedFeatures: parsed.matched_features ?? [],
      reasoning: parsed.reasoning ?? '',
    }
  } catch {
    return {
      patentId: patent.id,
      patentNumber: patent.management_number,
      similarityScore: 0,
      matchedFeatures: [],
      reasoning: 'JSON parse error',
    }
  }
}

const checkPatentSimilarity = async (
  client: ClaudeClient,
  listing: Listing,
  patents: Patent[],
): Promise<PatentSimilarityResult[]> => {
  const results: PatentSimilarityResult[] = []

  // 활성 특허만 체크
  const activePatents = patents.filter(p => p.status === 'registered')

  for (const patent of activePatents) {
    const prompt = buildPatentPrompt(listing, patent)

    // 특허에 이미지가 있으면 멀티모달
    if (patent.image_urls.length > 0 && listing.images.length > 0) {
      // 특허 이미지 + 리스팅 이미지를 함께 전송
      const images: { base64: string; mediaType: string }[] = []

      // 리스팅 이미지 (최대 2장)
      for (const img of listing.images.slice(0, 2)) {
        try {
          const res = await fetch(img.url)
          if (res.ok) {
            const buf = await res.arrayBuffer()
            images.push({
              base64: Buffer.from(buf).toString('base64'),
              mediaType: res.headers.get('content-type') ?? 'image/jpeg',
            })
          }
        } catch {
          // 이미지 fetch 실패 시 스킵
        }
      }

      if (images.length > 0) {
        const response = await client.callWithImages({
          model: MODEL_ROLES.worker,
          systemPrompt: 'You are a patent infringement analysis AI for Spigen. Compare products with patents.',
          messages: [{ role: 'user', content: prompt }],
          maxTokens: 2048,
          temperature: 0.2,
          images,
        })

        results.push(parsePatentResponse(response.content, patent))
        continue
      }
    }

    // 텍스트만 비교
    const response = await client.call({
      model: MODEL_ROLES.worker,
      systemPrompt: 'You are a patent infringement analysis AI for Spigen. Compare products with patents.',
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 2048,
      temperature: 0.2,
    })

    results.push(parsePatentResponse(response.content, patent))
  }

  return results
}

export { checkPatentSimilarity }
