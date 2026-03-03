// Seller Central 신고 경로 매뉴얼
// Brand Registry > Report a Violation 페이지 기준
// Extension sc-form-filler.ts / Crawler SC 자동화에서 참조

export const SC_REPORT_TYPES = {
  incorrect_variation: 'Incorrect Variation',
  product_review_violation: 'Product review violation',
  other_policy_violation: 'Other Policy Violation',
} as const

export type ScReportType = (typeof SC_REPORT_TYPES)[keyof typeof SC_REPORT_TYPES]

// 위반 유형 → SC 신고 경로 매핑
export const SC_SUBMISSION_PATHS = {
  // ─────────────────────────────────────────────
  // V07: 부정확한 상품 정보
  // ─────────────────────────────────────────────
  V07: {
    path: 'Brand Registry > Report a store policy violation > Other Policy Violation',
    reportType: SC_REPORT_TYPES.other_policy_violation,
    fields: {
      subject: 'Pre-announcement Listing',  // or "Wrong Category"
      description: 'Describe which Amazon policy is being violated and how the specified party is violating it.*',
      urls: 'Provide up to 10 URL(s) in a new line for each product detail page.*',
    },
    subjectVariants: {
      pre_announcement: 'Pre-announcement Listing',
      wrong_category: 'Wrong Category',
    },
    maxUrls: 10,
    notes: 'variation 아래 해당 URL 모두, 10개까지',
  },

  // ─────────────────────────────────────────────
  // V08: 이미지 정책 위반
  // ─────────────────────────────────────────────
  V08: {
    path: 'Brand Registry > Report a store policy violation > Other Policy Violation',
    reportType: SC_REPORT_TYPES.other_policy_violation,
    fields: {
      subject: 'Main image violation',
      description: 'Describe which Amazon policy is being violated and how the specified party is violating it.*',
      urls: 'Provide up to 10 URL(s) in a new line for each product detail page.*',
    },
    maxUrls: 10,
    notes: 'Subject에 "Main image violation" 고정 입력',
  },

  // ─────────────────────────────────────────────
  // V10: Variation 정책 위반
  // ─────────────────────────────────────────────
  V10: {
    path: 'Brand Registry > Report a store policy violation > Incorrect Variation',
    reportType: SC_REPORT_TYPES.incorrect_variation,
    fields: {
      description: 'Describe which Amazon policy is being violated and how the specified party is violating it.*',
      urls: 'Provide up to 10 URL(s) in a new line for each product detail page.*',
    },
    maxUrls: 10,
    notes: 'Subject 없음 — Incorrect Variation 선택 시 바로 Description 입력',
  },

  // ─────────────────────────────────────────────
  // V11: 리뷰 조작
  // ─────────────────────────────────────────────
  V11: {
    path: 'Brand Registry > Report a store policy violation > Product review violation',
    reportType: SC_REPORT_TYPES.product_review_violation,
    fields: {
      description: 'Describe which Amazon policy is being violated and how the specified party is violating it.*',
      asins: 'List up to 10 ASIN(s) for the product(s) in a comma separated list.*',
      reviewUrls: 'Provide up to 10 URL(s) in a new line for each product review you want to report.',
    },
    maxAsins: 10,
    maxReviewUrls: 10,
    notes: 'ASIN 한 개만 입력. Review URL은 별 3,4,5인 것만 선별, 최대 10개',
  },

  // ─────────────────────────────────────────────
  // V12: 리뷰 하이재킹
  // ─────────────────────────────────────────────
  V12: {
    path: 'Brand Registry > Report a store policy violation > Product review violation',
    reportType: SC_REPORT_TYPES.product_review_violation,
    fields: {
      description: 'Describe which Amazon policy is being violated and how the specified party is violating it.*',
      asins: 'List up to 10 ASIN(s) for the product(s) in a comma separated list.*',
      reviewUrls: 'Provide up to 10 URL(s) in a new line for each product review you want to report.',
    },
    maxAsins: 10,
    maxReviewUrls: 10,
    notes: '다른 제품 리뷰가 섞여있는 경우 — Product review violation 경로 사용',
  },
} as const

// 위반코드 → SC 경로 자동 매핑 (sc-form-filler에서 사용)
export const getSubmissionPath = (violationCode: string): typeof SC_SUBMISSION_PATHS[keyof typeof SC_SUBMISSION_PATHS] | null => {
  const code = violationCode as keyof typeof SC_SUBMISSION_PATHS
  return SC_SUBMISSION_PATHS[code] ?? null
}

// SC 폼 필드 ID 참조 (Brand Registry RAV 페이지)
export const SC_FORM_FIELDS = {
  reportType: '#report-type-select',        // 신고 유형 드롭다운
  subject: '#subject-input',                // Subject 텍스트 필드
  description: '#description-textarea',     // Description 텍스트에어리어
  urls: '#urls-textarea',                   // URL 입력 필드
  asins: '#asins-input',                    // ASIN 입력 필드
  reviewUrls: '#review-urls-textarea',      // 리뷰 URL 입력 필드
  submitButton: '#submit-report-button',    // 제출 버튼
} as const
