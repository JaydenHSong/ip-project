// SC "Report a Violation" 페이지 DOM 셀렉터
// 셀렉터 분리 — SC 페이지 구조 변경 시 이 파일만 수정
// 실제 SC 페이지 분석 후 셀렉터 확정 필요

export const SC_SELECTORS = {
  // RAV 페이지 감지
  pageDetect: [
    () => document.querySelector('[data-testid="report-abuse-page"]'),
    () => {
      const h1 = document.querySelector('h1')
      return h1?.textContent?.toLowerCase().includes('report') ? h1 : null
    },
    () => window.location.pathname.includes('abuse-submission') ? document.body : null,
  ],

  // SC 로그인 상태 감지
  loginDetect: [
    () => document.querySelector('[data-testid="user-menu"]'),
    () => document.querySelector('#sc-navbar-user'),
    () => document.querySelector('.navbar-user-name'),
  ],

  // ASIN 입력 필드
  asinInput: [
    () => document.querySelector<HTMLInputElement>('input[name="asin"]'),
    () => document.querySelector<HTMLInputElement>('[data-testid="asin-input"]'),
    () => document.querySelector<HTMLInputElement>('input[placeholder*="ASIN"]'),
  ],

  // 위반 유형 드롭다운
  violationTypeSelect: [
    () => document.querySelector<HTMLSelectElement>('select[name="violation_type"]'),
    () => document.querySelector<HTMLSelectElement>('[data-testid="violation-type"]'),
    () => document.querySelector<HTMLSelectElement>('select[name="issue_type"]'),
  ],

  // 설명 텍스트영역
  descriptionTextarea: [
    () => document.querySelector<HTMLTextAreaElement>('textarea[name="description"]'),
    () => document.querySelector<HTMLTextAreaElement>('[data-testid="description"]'),
    () => document.querySelector<HTMLTextAreaElement>('textarea[name="details"]'),
  ],

  // 증거 URL 입력
  evidenceInput: [
    () => document.querySelector<HTMLInputElement>('input[name="evidence_url"]'),
    () => document.querySelector<HTMLInputElement>('[data-testid="evidence-url"]'),
    () => document.querySelector<HTMLInputElement>('input[name="evidence"]'),
  ],

  // Submit 버튼 (감지용, 클릭하지 않음)
  submitButton: [
    () => document.querySelector<HTMLButtonElement>('button[type="submit"]'),
    () => document.querySelector<HTMLButtonElement>('[data-testid="submit-button"]'),
  ],

  // 제출 완료 확인 (URL 변경 또는 확인 메시지)
  submissionConfirm: [
    () => document.querySelector('[data-testid="submission-success"]'),
    () => document.querySelector('.success-message'),
    () => {
      const els = document.querySelectorAll('h1, h2, .alert-success')
      for (const el of els) {
        if (el.textContent?.toLowerCase().includes('submitted') ||
            el.textContent?.toLowerCase().includes('success')) {
          return el
        }
      }
      return null
    },
  ],

  // 케이스 ID 추출
  caseId: [
    () => document.querySelector('[data-testid="case-id"]')?.textContent?.trim(),
    () => {
      const text = document.body.textContent ?? ''
      const match = text.match(/Case\s*(?:ID|#)?\s*:?\s*(\d{10,})/i)
      return match?.[1] ?? null
    },
  ],
} as const
