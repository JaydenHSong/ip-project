// Amazon Product Page "Report an issue" — Pre-built comment templates
// Extension fills these instantly during front-end auto-report
// Templates are short, factual, and Amazon-style to avoid flagging

type FrontTemplate = {
  l1: string
  l2?: string
  l3?: string
  checkboxes?: string[]  // for "Parts of this page don't match" (multi-select)
  comment: (ctx: ReportContext) => string
  extraFields?: (ctx: ReportContext) => Record<string, string>
}

type ReportContext = {
  asin: string
  sellerName?: string
  brandName?: string
  violationType: string      // V01~V19
  violationName: string      // e.g. "Counterfeit Product"
  aiDetails: string          // AI-generated violation description
  listingTitle?: string
  marketplace?: string
}

// Comment templates — concise, factual, no emotional language
const templates: Record<string, (ctx: ReportContext) => string> = {
  counterfeit: (ctx) =>
    `This product appears to be a counterfeit of ${ctx.brandName ?? 'a known brand'}. ` +
    `The listing for ASIN ${ctx.asin} shows signs of unauthorized reproduction. ${ctx.aiDetails}`,

  falseAdvertising: (ctx) =>
    `The listing for ASIN ${ctx.asin} contains misleading or inaccurate claims. ${ctx.aiDetails}`,

  prohibitedKeywords: (ctx) =>
    `The listing for ASIN ${ctx.asin} contains prohibited or restricted content in its description. ${ctx.aiDetails}`,

  inaccurateInfo: (ctx) =>
    `Product information for ASIN ${ctx.asin} appears to be inaccurate or incomplete. ${ctx.aiDetails}`,

  imageViolation: (ctx) =>
    `The images on this listing (ASIN ${ctx.asin}) do not accurately represent the product or violate image guidelines. ${ctx.aiDetails}`,

  comparativeAd: (ctx) =>
    `This listing (ASIN ${ctx.asin}) contains unauthorized comparative advertising or references to competing brands. ${ctx.aiDetails}`,

  variationAbuse: (ctx) =>
    `This listing (ASIN ${ctx.asin}) appears to misuse variation relationships. Product details do not match across variations. ${ctx.aiDetails}`,

  reviewManipulation: (ctx) =>
    `The seller${ctx.sellerName ? ` "${ctx.sellerName}"` : ''} appears to be engaging in review manipulation for ASIN ${ctx.asin}. ${ctx.aiDetails}`,

  reviewHijacking: (ctx) =>
    `Reviews on this listing (ASIN ${ctx.asin}) appear to belong to a different product. The reviews do not match the currently listed item. ${ctx.aiDetails}`,

  priceManipulation: (ctx) =>
    `The pricing for ASIN ${ctx.asin} appears to be manipulated or deceptive. ${ctx.aiDetails}`,

  resaleViolation: (ctx) =>
    `The seller${ctx.sellerName ? ` "${ctx.sellerName}"` : ''} appears to be selling ASIN ${ctx.asin} without proper authorization. ${ctx.aiDetails}`,

  bundlingViolation: (ctx) =>
    `This listing (ASIN ${ctx.asin}) contains bundling or multi-pack claims that don't match the actual product. ${ctx.aiDetails}`,

  safetyRegulation: (ctx) =>
    `This product (ASIN ${ctx.asin}) may not comply with required safety certifications or regulations. ${ctx.aiDetails}`,

  missingWarning: (ctx) =>
    `This product (ASIN ${ctx.asin}) is missing required warning labels or safety information. ${ctx.aiDetails}`,

  importViolation: (ctx) =>
    `This product (ASIN ${ctx.asin}) may violate import regulations or lack required compliance documentation. ${ctx.aiDetails}`,

  generic: (ctx) =>
    `Issue with listing ASIN ${ctx.asin}: ${ctx.aiDetails}`,
}

// ============================================================
// V01~V19 → Front-end form path + template mapping
// ============================================================

export const FRONT_REPORT_CONFIGS: Record<string, FrontTemplate | null> = {
  // IP — Redirect to separate form, not automatable from product page
  V01: null,
  V02: null,
  V03: null,

  // Counterfeit — direct match
  V04: {
    l1: 'This product or content is illegal, unsafe or suspicious',
    l2: "It's counterfeit",
    comment: templates.counterfeit,
  },

  // False Advertising
  V05: {
    l1: 'Some product information is missing, inaccurate or could be improved',
    l2: 'Other',
    comment: templates.falseAdvertising,
  },

  // Prohibited Keywords
  V06: {
    l1: 'Other',
    comment: templates.prohibitedKeywords,
  },

  // Inaccurate Product Info
  V07: {
    l1: 'Some product information is missing, inaccurate or could be improved',
    l2: 'Other',
    comment: templates.inaccurateInfo,
  },

  // Image Policy Violation
  V08: {
    l1: 'Parts of this page don\'t match',
    checkboxes: ['Images'],
    comment: templates.imageViolation,
  },

  // Comparative Advertising
  V09: {
    l1: 'Other',
    comment: templates.comparativeAd,
  },

  // Variation Policy Violation
  V10: {
    l1: 'Parts of this page don\'t match',
    checkboxes: ['Title', 'Bullet Points', 'Other'],
    comment: templates.variationAbuse,
  },

  // Review Manipulation
  V11: {
    l1: 'I have an issue with a Seller',
    l2: 'Seller is attempting to manipulate reviews',
    l3: 'Seller is offering me money, refund, or something else to post or remove a review',
    comment: templates.reviewManipulation,
  },

  // Review Hijacking
  V12: {
    l1: 'Parts of this page don\'t match',
    checkboxes: ['Reviews'],
    comment: templates.reviewHijacking,
  },

  // Price Manipulation
  V13: {
    l1: 'I have an issue with the price',
    l2: 'I have found a lower price',
    comment: templates.priceManipulation,
    extraFields: (ctx) => ({
      competitorName: ctx.brandName ?? 'Original Brand',
      competitorUrl: `https://www.amazon.com/dp/${ctx.asin}`,
      price: '0.01',  // placeholder — triggers review
    }),
  },

  // Resale Violation
  V14: {
    l1: 'I have an issue with a Seller',
    l2: 'Other issue with Seller',
    comment: templates.resaleViolation,
  },

  // Bundling Violation
  V15: {
    l1: 'Parts of this page don\'t match',
    checkboxes: ['Title', 'Bullet Points', 'Other'],
    comment: templates.bundlingViolation,
  },

  // Missing Certification (FCC/UL)
  V16: {
    l1: 'This product or content is illegal, unsafe or suspicious',
    l2: "It's not safe or compliant with product safety regulations",
    comment: templates.safetyRegulation,
  },

  // Safety Standards Failure
  V17: {
    l1: 'This product or content is illegal, unsafe or suspicious',
    l2: "It's not safe or compliant with product safety regulations",
    comment: templates.safetyRegulation,
  },

  // Missing Warning Label
  V18: {
    l1: 'This product or content is illegal, unsafe or suspicious',
    l2: "It's not safe or compliant with product safety regulations",
    comment: templates.missingWarning,
  },

  // Import Regulation Violation
  V19: {
    l1: 'This product or content is illegal, unsafe or suspicious',
    l2: 'This product/content is otherwise illegal',
    comment: templates.importViolation,
  },
}

// Re-export shared check
export { isFrontReportable } from '@shared/front-report-config'

// Helper: get filled template for a violation
export const getFrontReportData = (
  violationCode: string,
  ctx: ReportContext,
): FrontTemplate & { filledComment: string; filledExtraFields?: Record<string, string> } | null => {
  const config = FRONT_REPORT_CONFIGS[violationCode]
  if (!config) return null

  return {
    ...config,
    filledComment: config.comment(ctx),
    filledExtraFields: config.extraFields?.(ctx),
  }
}
