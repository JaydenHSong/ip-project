// 스크린샷 검증 프롬프트 — Haiku Vision 전용

const VERIFY_PROMPT_TEMPLATE = `Compare this Amazon product page screenshot with the parsed data below.
Check if the following fields match what you see in the screenshot:

## Parsed Data
- Title: {{title}}
- Price: {{price}}
- Seller: {{seller}}
- Rating: {{rating}}

## Instructions
1. Read the product title from the screenshot carefully
2. Find the price displayed on the page
3. Identify the seller/sold by information
4. Check the star rating and review count
5. Compare each field with the parsed data above

## Response Format (JSON only)
{
  "match": true/false,
  "corrections": {
    "title": "correct value from screenshot",
    "price": "correct value"
  },
  "mismatchFields": ["title", "price"],
  "confidence": 0.95
}

If all fields match, set "match": true, "corrections": null, "mismatchFields": [].
If any field doesn't match, set "match": false and provide corrections for mismatched fields only.
The confidence score (0-1) reflects how clearly you can read the screenshot.`

const buildVerifyPrompt = (parsedData: {
  title: string
  price: string | null
  seller: string | null
  rating: string | null
}): string => {
  return VERIFY_PROMPT_TEMPLATE
    .replace('{{title}}', parsedData.title)
    .replace('{{price}}', parsedData.price ?? '(not available)')
    .replace('{{seller}}', parsedData.seller ?? '(not available)')
    .replace('{{rating}}', parsedData.rating ?? '(not available)')
}

export { buildVerifyPrompt }
