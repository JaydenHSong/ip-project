// 위반 분석 프롬프트 — Sonnet 전용

import type { Listing } from '@/types/listings'
import type { Patent } from '@/types/patents'

const ANALYZE_PROMPT_TEMPLATE = `Analyze the following Amazon listing for potential policy violations against Spigen.

## Listing Data
- ASIN: {{asin}}
- Title: {{title}}
- Brand: {{brand}}
- Seller: {{seller}}
- Price: {{price}}
- Rating: {{rating}} ({{reviewCount}} reviews)

### Description
{{description}}

### Bullet Points
{{bulletPoints}}

{{PATENT_SECTION}}

{{IMAGE_SECTION}}

## Instructions
1. Check for trademark infringement (V01) — unauthorized Spigen name/logo usage
2. Check for copyright infringement (V02) — stolen images from Spigen listings
3. Check for patent infringement (V03) — if patent data is provided
4. Check for counterfeit (V04) — fake Spigen products
5. Check listing content violations (V05-V10) — false claims, restricted keywords, image policy
6. Check review manipulation (V11-V12)
7. Check selling practice violations (V13-V15)
8. Check regulatory violations (V16-V19)

## Response Format (JSON only)
{
  "violation_detected": true/false,
  "violations": [
    {
      "type": "V01",
      "confidence": 85,
      "category": "intellectual_property",
      "severity": "high",
      "reasons": ["Unauthorized use of 'Spigen' trademark in listing title"],
      "evidence": [
        {
          "type": "text",
          "url": "",
          "description": "Title contains 'Spigen' but seller is not Spigen Inc"
        }
      ],
      "policy_references": [
        {
          "code": "Amazon Anti-Counterfeiting Policy",
          "url": "https://sellercentral.amazon.com/help/hub/reference/G201165970",
          "section": "Intellectual Property Violations"
        }
      ]
    }
  ],
  "summary": "Brief summary of findings"
}

If no violations found, return: {"violation_detected": false, "violations": [], "summary": "No violations detected"}`

const buildAnalyzePrompt = (
  listing: Listing,
  patents?: Patent[],
): string => {
  const bulletPointsStr = listing.bullet_points.length > 0
    ? listing.bullet_points.map((bp, i) => `${i + 1}. ${bp}`).join('\n')
    : '(none)'

  let patentSection = ''
  if (patents && patents.length > 0) {
    const patentLines = patents.map(p =>
      `- ${p.management_number}: ${p.name} (${p.country}, status: ${p.status})` +
      (p.keywords.length > 0 ? `\n  Keywords: ${p.keywords.join(', ')}` : ''),
    ).join('\n')
    patentSection = `## Patent Registry (Check V03)\n${patentLines}`
  }

  const imageSection = listing.images.length > 0
    ? '## Images\n[Product images are attached for visual analysis. Check for logo/trademark usage and image theft.]'
    : ''

  return ANALYZE_PROMPT_TEMPLATE
    .replace('{{asin}}', listing.asin)
    .replace('{{title}}', listing.title ?? '(unknown)')
    .replace('{{brand}}', listing.brand ?? '(unknown)')
    .replace('{{seller}}', listing.seller_name ?? '(unknown)')
    .replace('{{price}}', listing.price_amount
      ? `${listing.price_currency ?? '$'}${listing.price_amount}`
      : '(not available)')
    .replace('{{rating}}', listing.rating ? String(listing.rating) : 'N/A')
    .replace('{{reviewCount}}', listing.review_count ? String(listing.review_count) : '0')
    .replace('{{description}}', (listing.description ?? '(none)') as string)
    .replace('{{bulletPoints}}', bulletPointsStr)
    .replace('{{PATENT_SECTION}}', patentSection)
    .replace('{{IMAGE_SECTION}}', imageSection)
}

export { buildAnalyzePrompt }
