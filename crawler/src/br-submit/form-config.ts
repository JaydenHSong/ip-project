// BR 폼 타입별 필드 설정 — Single Source of Truth
// Worker, Scheduler, Web AI 드래프트 생성 시 이 설정을 참조

import type { BrFormType } from './types.js'

type FieldDef = {
  key: string           // 내부 식별자
  labelPrefix: string   // kat-label 텍스트 매칭 (startsWith)
  element: 'kat-textarea' | 'kat-input'
  required: boolean
}

type FormConfig = {
  menuText: string      // BR 좌측 메뉴 텍스트
  formId: number        // BR hill/website/form/{id}
  fields: FieldDef[]
}

const BR_FORM_CONFIG: Record<BrFormType, FormConfig> = {
  other_policy: {
    menuText: 'Other policy violations',
    formId: 5871,
    fields: [
      { key: 'subject', labelPrefix: 'Subject', element: 'kat-input', required: false },
      { key: 'description', labelPrefix: 'Describe which Amazon policy is being violated', element: 'kat-textarea', required: true },
      { key: 'urls', labelPrefix: 'Provide up to 10 URL(s)', element: 'kat-textarea', required: true },
      { key: 'storefront_url', labelPrefix: 'Provide the seller storefront URL', element: 'kat-input', required: false },
      { key: 'policy_url', labelPrefix: 'Provide the URL to the specific Amazon policy', element: 'kat-input', required: false },
    ],
  },
  incorrect_variation: {
    menuText: 'Incorrect variation',
    formId: 5781,
    fields: [
      { key: 'subject', labelPrefix: 'Subject', element: 'kat-input', required: false },
      { key: 'description', labelPrefix: 'Describe what makes the product an incorrect variation', element: 'kat-textarea', required: true },
      { key: 'urls', labelPrefix: 'Provide up to 10 URL(s)', element: 'kat-textarea', required: true },
    ],
  },
  product_review: {
    menuText: 'Product review violation',
    formId: 5791,
    fields: [
      { key: 'subject', labelPrefix: 'Subject', element: 'kat-input', required: false },
      { key: 'description', labelPrefix: 'Describe the review policy violation', element: 'kat-textarea', required: true },
      { key: 'asins', labelPrefix: 'List up to 10 ASIN(s)', element: 'kat-input', required: true },
      { key: 'review_urls', labelPrefix: 'Provide up to 10 URL(s) in a new line for each product review', element: 'kat-textarea', required: true },
      { key: 'order_id', labelPrefix: 'If this violation occurred as part of a purchase, provide the order ID', element: 'kat-input', required: false },
    ],
  },
}

const PARENT_MENU_TEXT = 'Report a store policy violation'

export { BR_FORM_CONFIG, PARENT_MENU_TEXT }
export type { FormConfig, FieldDef }
