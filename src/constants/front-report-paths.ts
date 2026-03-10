// Amazon Product Page "Report an issue" Front-end Dropdown Tree
// Mapped from actual Amazon US screenshots (2026-03-07)
// Used by Extension for two-track reporting (front-end auto-click + PD backend)

// ============================================================
// Level 1: "What is wrong with this page?"
// ============================================================
export const FRONT_REPORT_L1 = {
  ORDER_PROBLEM: 'There\'s a problem with my order',
  MISSING_INFO: 'Some product information is missing, inaccurate or could be improved',
  PARTS_DONT_MATCH: 'Parts of this page don\'t match',
  PRICE_ISSUE: 'I have an issue with the price',
  OFFENSIVE: 'This product or content is offensive',
  ILLEGAL_UNSAFE: 'This product or content is illegal, unsafe or suspicious',
  SELLER_ISSUE: 'I have an issue with a Seller',
  OTHER: 'Other',
} as const

// ============================================================
// Level 2 sub-options per L1 category
// ============================================================

// L1: "Some product information is missing, inaccurate or could be improved"
// → "What information is missing/needs improvement?" (dropdown)
export const FRONT_MISSING_INFO_L2 = {
  IMAGES: 'Images',
  SIZE_DIMENSIONS: 'Size/dimensions',
  RELEASE_INFO: 'Release information',
  MODEL_EDITION: 'Model/edition',
  BRAND: 'Brand',
  OTHER: 'Other',
} as const
// Form: dropdown + Comments (optional) → Submit

// L1: "Parts of this page don't match"
// → "Which parts don't match?" (checkboxes, multi-select)
export const FRONT_PARTS_DONT_MATCH_L2 = {
  REVIEWS: 'Reviews',
  IMAGES: 'Images',
  TITLE: 'Title',
  BULLET_POINTS: 'Bullet Points',
  BRAND: 'Brand',
  OTHER: 'Other',
} as const
// Form: checkboxes + Comments (optional) → Submit

// L1: "I have an issue with the price"
// → "What is the issue?" (dropdown)
export const FRONT_PRICE_ISSUE_L2 = {
  LOWER_PRICE: 'I have found a lower price',
  HIGHER_SHIPPING: 'Higher shipping costs than expected',
} as const
// LOWER_PRICE form: Competitor Name*, Competitor URL*, Price ($)* → Submit
// HIGHER_SHIPPING form: Comments (optional) → Submit

// L1: "This product or content is offensive"
// → "Why is it offensive?" (dropdown)
export const FRONT_OFFENSIVE_L2 = {
  SEXUALLY_EXPLICIT: 'Sexually explicit content',
  OTHER: 'Other',
} as const
// Form: dropdown + Comments (optional) → Submit

// L1: "This product or content is illegal, unsafe or suspicious"
// → "What is the issue?" (dropdown)
export const FRONT_ILLEGAL_L2 = {
  COUNTERFEIT: 'It\'s counterfeit',
  IP_INFRINGEMENT: 'It uses my intellectual property without my permission',
  SAFETY_REGULATIONS: 'It\'s not safe or compliant with product safety regulations',
  ILLEGAL_REVIEWS: 'Reviews/Questions and Answers contain illegal content',
  OTHERWISE_ILLEGAL: 'This product/content is otherwise illegal',
} as const
// COUNTERFEIT form: checkbox (good faith belief) + Details* → Submit
// IP_INFRINGEMENT: REDIRECTS to "Report Infringement Form" (별도 페이지)
// SAFETY_REGULATIONS: → "Why isn't this product safe or compliant?" dropdown → Submit
// ILLEGAL_REVIEWS: → "Where is the issue?" dropdown → Submit
// OTHERWISE_ILLEGAL: → form

// L1: "I have an issue with a Seller"
// → "What is the issue?" (dropdown)
export const FRONT_SELLER_ISSUE_L2 = {
  FALSE_IDENTITY: 'Seller is using false or misleading identity information',
  FALSE_CONTACT: 'Seller is using false or misleading contact information',
  MANIPULATE_REVIEWS: 'Seller is attempting to manipulate reviews',
  INAPPROPRIATE_ACTIVITY: 'Seller is engaging in other inappropriate activity',
  STOLEN_PRODUCT: 'Seller is selling a potentially stolen product',
  OTHER: 'Other issue with Seller',
} as const

// ============================================================
// Level 3 sub-options (Seller issue deep paths)
// ============================================================

// Seller → False identity info → Level 3
export const FRONT_SELLER_IDENTITY_L3 = {
  BUSINESS_INFO: 'Seller is representing my business information as its own',
  PERSONAL_INFO: 'Seller is using my personal information as its own',
  OTHER: 'Other',
} as const
// Form: Describe the issue* + Store name → Submit

// Seller → False contact info → Level 3
export const FRONT_SELLER_CONTACT_L3 = {
  FALSE_ADDRESS: 'Seller is using a false or inaccurate address information',
  FALSE_PHONE: 'Seller is using a false or inaccurate phone number',
  OTHER: 'Other',
} as const
// Form: Describe the issue* + Store name → Submit

// Seller → Manipulate reviews → Level 3
export const FRONT_SELLER_REVIEWS_L3 = {
  UNWANTED_COMMS: 'Seller is sending me unwanted communications about a review I posted',
  OFFERING_INCENTIVE: 'Seller is offering me money, refund, or something else to post or remove a review',
  OTHER: 'Other',
} as const
// Form: Describe the issue* + Store name → Submit

// Seller → Other inappropriate activity → Level 3
export const FRONT_SELLER_ACTIVITY_L3 = {
  UNSOLICITED_COMMS: 'Seller is sending me unsolicited or inappropriate communications',
  DAMAGE_BUSINESS: 'Seller is attempting to damage my business, listings or ratings',
  DECEPTIVE_TACTICS: 'Seller is using unfair or deceptive business tactics',
  OTHER: 'Other',
} as const
// Form: Describe the issue* + Store name → Submit

// ============================================================
// V01~V19 → Amazon Front-end "Report an issue" Path Mapping
// ============================================================
// track: 'front' = auto-clickable, 'redirect' = redirects to separate form, 'none' = no good match
// automatable: true = Extension can auto-fill & submit, false = needs manual or redirect

type FrontReportPath = {
  l1: string
  l2?: string
  l3?: string
  formFields?: Record<string, string>  // field name → what to fill
  track: 'front' | 'redirect' | 'partial'
  automatable: boolean
  notes?: string
}

export const VIOLATION_FRONT_PATHS: Record<string, FrontReportPath> = {
  // --- Intellectual Property ---
  V01: {
    l1: FRONT_REPORT_L1.ILLEGAL_UNSAFE,
    l2: FRONT_ILLEGAL_L2.IP_INFRINGEMENT,
    track: 'redirect',
    automatable: false,
    notes: 'Redirects to "Report Infringement Form" - separate page, not submittable from product page modal',
  },
  V02: {
    l1: FRONT_REPORT_L1.ILLEGAL_UNSAFE,
    l2: FRONT_ILLEGAL_L2.IP_INFRINGEMENT,
    track: 'redirect',
    automatable: false,
    notes: 'Same redirect as V01 - IP infringement goes to dedicated form',
  },
  V03: {
    l1: FRONT_REPORT_L1.ILLEGAL_UNSAFE,
    l2: FRONT_ILLEGAL_L2.IP_INFRINGEMENT,
    track: 'redirect',
    automatable: false,
    notes: 'Same redirect as V01/V02 - Patent claims go to dedicated form',
  },
  V04: {
    l1: FRONT_REPORT_L1.ILLEGAL_UNSAFE,
    l2: FRONT_ILLEGAL_L2.COUNTERFEIT,
    formFields: { goodFaithCheckbox: 'checked', details: '{ai_generated_details}' },
    track: 'front',
    automatable: true,
    notes: 'Checkbox + Details text field. High impact - counterfeit reports taken seriously',
  },

  // --- Listing Content ---
  V05: {
    l1: FRONT_REPORT_L1.MISSING_INFO,
    l2: FRONT_MISSING_INFO_L2.OTHER,
    formFields: { comments: '{ai_generated_details}' },
    track: 'front',
    automatable: true,
    notes: 'False advertising → report as missing/inaccurate info with details in comments',
  },
  V06: {
    l1: FRONT_REPORT_L1.OTHER,
    formFields: { whatIsTheIssue: '{ai_generated_details}' },
    track: 'partial',
    automatable: true,
    notes: 'Prohibited keywords - no exact match, use Other with detailed explanation',
  },
  V07: {
    l1: FRONT_REPORT_L1.MISSING_INFO,
    l2: FRONT_MISSING_INFO_L2.OTHER,
    formFields: { comments: '{ai_generated_details}' },
    track: 'front',
    automatable: true,
    notes: 'Inaccurate product info - direct match to "missing, inaccurate or could be improved"',
  },
  V08: {
    l1: FRONT_REPORT_L1.PARTS_DONT_MATCH,
    l2: FRONT_PARTS_DONT_MATCH_L2.IMAGES,
    formFields: { comments: '{ai_generated_details}' },
    track: 'front',
    automatable: true,
    notes: 'Image violation - check "Images" checkbox. Also possible via MISSING_INFO → Images',
  },
  V09: {
    l1: FRONT_REPORT_L1.OTHER,
    formFields: { whatIsTheIssue: '{ai_generated_details}' },
    track: 'partial',
    automatable: true,
    notes: 'Comparative advertising - no exact match, use Other',
  },
  V10: {
    l1: FRONT_REPORT_L1.PARTS_DONT_MATCH,
    l2: FRONT_PARTS_DONT_MATCH_L2.OTHER,
    formFields: { comments: '{ai_generated_details}' },
    track: 'partial',
    automatable: true,
    notes: 'Variation abuse - check relevant checkboxes (Title, Bullet Points, etc.)',
  },

  // --- Review Manipulation ---
  V11: {
    l1: FRONT_REPORT_L1.SELLER_ISSUE,
    l2: FRONT_SELLER_ISSUE_L2.MANIPULATE_REVIEWS,
    l3: FRONT_SELLER_REVIEWS_L3.OFFERING_INCENTIVE,
    formFields: { describeIssue: '{ai_generated_details}' },
    track: 'front',
    automatable: true,
    notes: 'Review manipulation - direct 3-level path available',
  },
  V12: {
    l1: FRONT_REPORT_L1.PARTS_DONT_MATCH,
    l2: FRONT_PARTS_DONT_MATCH_L2.REVIEWS,
    formFields: { comments: '{ai_generated_details}' },
    track: 'front',
    automatable: true,
    notes: 'Review hijacking - "Parts don\'t match → Reviews". Alt: ILLEGAL → Reviews contain illegal content',
  },

  // --- Selling Practice ---
  V13: {
    l1: FRONT_REPORT_L1.PRICE_ISSUE,
    l2: FRONT_PRICE_ISSUE_L2.LOWER_PRICE,
    formFields: { competitorName: '{competitor}', competitorUrl: '{url}', price: '{price}' },
    track: 'front',
    automatable: true,
    notes: 'Price manipulation - direct match. Requires competitor info fields',
  },
  V14: {
    l1: FRONT_REPORT_L1.SELLER_ISSUE,
    l2: FRONT_SELLER_ISSUE_L2.OTHER,
    formFields: { describeIssue: '{ai_generated_details}' },
    track: 'partial',
    automatable: true,
    notes: 'Resale violation - no exact match, use Seller → Other',
  },
  V15: {
    l1: FRONT_REPORT_L1.PARTS_DONT_MATCH,
    l2: FRONT_PARTS_DONT_MATCH_L2.OTHER,
    formFields: { comments: '{ai_generated_details}' },
    track: 'partial',
    automatable: true,
    notes: 'Bundling violation - report as parts don\'t match with details',
  },

  // --- Regulatory / Safety ---
  V16: {
    l1: FRONT_REPORT_L1.ILLEGAL_UNSAFE,
    l2: FRONT_ILLEGAL_L2.SAFETY_REGULATIONS,
    formFields: { whyNotSafe: '{certification_type}' },
    track: 'front',
    automatable: true,
    notes: 'Missing FCC/UL cert - direct match to safety regulations path',
  },
  V17: {
    l1: FRONT_REPORT_L1.ILLEGAL_UNSAFE,
    l2: FRONT_ILLEGAL_L2.SAFETY_REGULATIONS,
    formFields: { whyNotSafe: '{safety_standard}' },
    track: 'front',
    automatable: true,
    notes: 'Safety standards failure - same path as V16',
  },
  V18: {
    l1: FRONT_REPORT_L1.ILLEGAL_UNSAFE,
    l2: FRONT_ILLEGAL_L2.SAFETY_REGULATIONS,
    formFields: { whyNotSafe: '{warning_label_type}' },
    track: 'front',
    automatable: true,
    notes: 'Missing warning label - same safety regulations path',
  },
  V19: {
    l1: FRONT_REPORT_L1.ILLEGAL_UNSAFE,
    l2: FRONT_ILLEGAL_L2.OTHERWISE_ILLEGAL,
    formFields: { details: '{ai_generated_details}' },
    track: 'front',
    automatable: true,
    notes: 'Import regulation violation - "otherwise illegal" catch-all',
  },
} as const

// ============================================================
// Summary: Two-Track Reporting Capability Matrix
// ============================================================
// front  = Extension can auto-click & submit on Amazon product page (12 types)
// redirect = Redirects to separate IP form - backend SC only (3 types: V01, V02, V03)
// partial = No exact front-end match, uses closest option (4 types: V06, V09, V10, V14, V15)
//
// Automatable: 16/19 (V01-V03 redirect to IP form, not automatable from product page)
//
// Best front-end matches (high confidence auto-fill):
//   V04 Counterfeit       → illegal/unsafe → counterfeit
//   V08 Image Violation   → parts don't match → Images
//   V11 Review Manipulation → seller issue → manipulate reviews
//   V13 Price Manipulation → price issue → lower price
//   V16-V18 Safety/Cert   → illegal/unsafe → safety regulations
//
// Strategy:
//   1. Extension detects Amazon login status (check #nav-link-accountList)
//   2. If logged in → front-end auto-report + PD backend (two-track)
//   3. If not logged in → PD backend only
//   4. V01-V03 IP types → PD backend only (front redirects to separate form)
