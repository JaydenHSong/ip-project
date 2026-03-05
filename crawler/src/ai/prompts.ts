// Claude Vision API 프롬프트

const PAGE_STATUS_PROMPT = `Analyze this Amazon page screenshot and determine its status.
Respond with ONLY a JSON object, no other text.

{
  "status": "normal" | "captcha" | "bot_detection" | "not_found" | "error" | "empty",
  "description": "brief description of what you see",
  "recommendation": "proceed" | "retry_proxy" | "retry_delay" | "skip"
}` as const

const SEARCH_RESULTS_PROMPT = `Analyze this Amazon search results page screenshot.
Extract all visible product listings. Respond with ONLY a JSON object, no other text.

{
  "page_status": "normal" | "no_results" | "captcha" | "blocked",
  "has_next_page": true | false,
  "products": [
    {
      "asin": "string or null if not visible",
      "title": "product title",
      "price": "price as shown (e.g. $29.99)",
      "is_sponsored": true | false,
      "position": 1
    }
  ]
}

Rules:
- Extract ALL visible products in order from top to bottom
- If ASIN is not visible in the screenshot, set it to null
- Distinguish sponsored products from organic results
- Look for "Next" or pagination at the bottom` as const

const DETAIL_PAGE_PROMPT = `Analyze this Amazon product detail page screenshot.
Extract all product information. Respond with ONLY a JSON object, no other text.

{
  "page_status": "normal" | "captcha" | "not_found" | "blocked",
  "title": "product title",
  "brand": "brand name or null",
  "price_amount": number or null,
  "price_currency": "USD" | "GBP" | "EUR" | "JPY" etc,
  "seller_name": "seller name or null",
  "rating": number (e.g. 4.5) or null,
  "review_count": number or null,
  "bullet_points": ["feature 1", "feature 2", ...],
  "description_summary": "brief description (max 200 chars) or null",
  "has_images": true | false,
  "image_count": number
}

Rules:
- Extract exact values as shown on the page
- If a field is not visible, set it to null
- For price, extract the numeric value only
- For review_count, extract the number (e.g. "1,234 ratings" -> 1234)` as const

const FIND_SEARCH_BAR_PROMPT = `Look at this Amazon homepage screenshot.
Find the search bar/input field where users type their search queries.
Respond with ONLY a JSON object, no other text.

{
  "found": true | false,
  "description": "what you see (e.g. 'search bar at top center')",
  "approximate_location": {
    "x_percent": number (0-100, horizontal position as percentage of page width),
    "y_percent": number (0-100, vertical position as percentage of page height)
  }
}` as const

const FIND_NEXT_BUTTON_PROMPT = `Look at this Amazon search results page screenshot.
Find the "Next" page button or pagination controls at the bottom.
Respond with ONLY a JSON object, no other text.

{
  "found": true | false,
  "has_next": true | false,
  "description": "what you see",
  "approximate_location": {
    "x_percent": number (0-100),
    "y_percent": number (0-100)
  }
}` as const

export {
  PAGE_STATUS_PROMPT,
  SEARCH_RESULTS_PROMPT,
  DETAIL_PAGE_PROMPT,
  FIND_SEARCH_BAR_PROMPT,
  FIND_NEXT_BUTTON_PROMPT,
}
