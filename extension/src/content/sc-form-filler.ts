// SC "Report a Violation" 페이지 — 폼 자동 채우기 content script
// Sentinel Extension이 SC 페이지에서 자동 실행
// 1. Sentinel API에서 대기 중 submit 데이터 조회
// 2. SC 폼에 자동 채우기
// 3. 사용자에게 토스트 표시
// 4. 제출 완료 감지 → 확인 콜백

import { SC_SELECTORS } from './sc-selectors'
import { API_BASE } from '@shared/constants'
import type { ScSubmitData } from '@shared/types'

const trySelectors = <T>(selectors: (() => T | null | undefined)[]): T | null => {
  for (const selector of selectors) {
    try {
      const result = selector()
      if (result !== null && result !== undefined && result !== '') return result
    } catch {
      // 셀렉터 실패 시 다음 시도
    }
  }
  return null
}

// chrome.storage에서 세션 토큰 조회
const getStoredToken = (): Promise<string | null> =>
  new Promise((resolve) => {
    chrome.storage.local.get(['auth.access_token'], (result) => {
      resolve((result['auth.access_token'] as string) ?? null)
    })
  })

// Sentinel API에서 대기 중 SC submit 데이터 조회
const fetchPendingSubmitData = async (): Promise<{
  report_id: string
  sc_submit_data: ScSubmitData
} | null> => {
  try {
    const token = await getStoredToken()
    if (!token) return null

    const res = await fetch(`${API_BASE}/reports/pending-sc-submit`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Extension-Version': chrome.runtime.getManifest().version,
      },
    })

    if (res.status === 204 || !res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

// React/Angular 호환 input value 설정
const setInputValue = (
  el: HTMLInputElement | HTMLTextAreaElement,
  value: string,
): void => {
  const setter =
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set ??
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set

  setter?.call(el, value)
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
}

// Select 값 설정
const setSelectValue = (el: HTMLSelectElement, value: string): void => {
  el.value = value
  el.dispatchEvent(new Event('change', { bubbles: true }))
}

// SC 폼에 데이터 채우기
const fillForm = (data: ScSubmitData): boolean => {
  let allFilled = true

  // ASIN
  const asinInput = trySelectors(SC_SELECTORS.asinInput)
  if (asinInput) {
    setInputValue(asinInput, data.asin)
  } else {
    allFilled = false
  }

  // 위반 유형 선택
  const violationSelect = trySelectors(SC_SELECTORS.violationTypeSelect)
  if (violationSelect) {
    setSelectValue(violationSelect, data.violation_type_sc)
  } else {
    allFilled = false
  }

  // Description
  const descTextarea = trySelectors(SC_SELECTORS.descriptionTextarea)
  if (descTextarea) {
    setInputValue(descTextarea, data.description)
  } else {
    allFilled = false
  }

  // Evidence URLs (optional — 실패해도 allFilled 유지)
  if (data.evidence_urls.length > 0) {
    const evidenceInput = trySelectors(SC_SELECTORS.evidenceInput)
    if (evidenceInput) {
      setInputValue(evidenceInput, data.evidence_urls.join('\n'))
    }
  }

  return allFilled
}

// Sentinel API — 제출 완료 콜백
const confirmSubmitted = async (
  reportId: string,
  caseId: string | null,
): Promise<void> => {
  try {
    const token = await getStoredToken()
    if (!token) return

    await fetch(`${API_BASE}/reports/${reportId}/confirm-submitted`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Extension-Version': chrome.runtime.getManifest().version,
      },
      body: JSON.stringify({
        sc_case_id: caseId ?? undefined,
      }),
    })
  } catch {
    // fire-and-forget
  }
}

// 제출 완료 감지 (MutationObserver + URL 변경 감시)
const observeSubmission = (reportId: string): void => {
  let currentUrl = window.location.href

  // URL 변경 감시
  const urlCheckInterval = setInterval(() => {
    if (window.location.href !== currentUrl) {
      currentUrl = window.location.href
      const confirmEl = trySelectors(SC_SELECTORS.submissionConfirm)
      if (confirmEl) {
        clearInterval(urlCheckInterval)
        observer.disconnect()
        handleSubmissionComplete(reportId)
      }
    }
  }, 1000)

  // DOM 변경 감시
  const observer = new MutationObserver(() => {
    const confirmEl = trySelectors(SC_SELECTORS.submissionConfirm)
    if (confirmEl) {
      observer.disconnect()
      clearInterval(urlCheckInterval)
      handleSubmissionComplete(reportId)
    }
  })

  observer.observe(document.body, { childList: true, subtree: true })

  // 5분 타임아웃
  setTimeout(() => {
    observer.disconnect()
    clearInterval(urlCheckInterval)
  }, 5 * 60 * 1000)
}

const handleSubmissionComplete = async (reportId: string): Promise<void> => {
  const caseId = trySelectors(SC_SELECTORS.caseId)
  await confirmSubmitted(reportId, caseId)
  showToast(
    `SC 제출 완료!${caseId ? ` Case ID: ${caseId}` : ''}`,
    'success',
  )
}

// 토스트 UI (SC 페이지 위에 오버레이)
const showToast = (
  message: string,
  type: 'success' | 'warning' | 'error',
): void => {
  const toast = document.createElement('div')
  toast.textContent = `\u{1F6E1}\uFE0F Sentinel: ${message}`

  const bgColor =
    type === 'success' ? '#16a34a' :
    type === 'warning' ? '#d97706' :
    '#dc2626'

  Object.assign(toast.style, {
    position: 'fixed',
    top: '16px',
    right: '16px',
    padding: '12px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    zIndex: '99999',
    color: '#fff',
    backgroundColor: bgColor,
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    transition: 'opacity 0.3s',
  })

  document.body.appendChild(toast)

  setTimeout(() => {
    toast.style.opacity = '0'
    setTimeout(() => toast.remove(), 300)
  }, 5000)
}

// 메인 초기화
const init = async (): Promise<void> => {
  // 1. SC RAV 페이지인지 확인
  const isRavPage = trySelectors(SC_SELECTORS.pageDetect)
  if (!isRavPage) return

  // 2. SC 로그인 상태 확인
  const isLoggedIn = trySelectors(SC_SELECTORS.loginDetect)
  if (!isLoggedIn) {
    showToast('SC에 로그인하세요.', 'warning')
    return
  }

  // 3. Sentinel API에서 대기 중 데이터 조회
  const pendingData = await fetchPendingSubmitData()
  if (!pendingData) return // Sentinel에서 온 것이 아님

  // 4. 폼 채우기
  const allFilled = fillForm(pendingData.sc_submit_data)

  if (allFilled) {
    showToast('폼 채우기 완료. 확인 후 Submit 클릭하세요.', 'success')
  } else {
    showToast('일부 필드를 채우지 못했습니다. 수동으로 확인하세요.', 'warning')
  }

  // 5. 제출 완료 감지
  observeSubmission(pendingData.report_id)
}

init()
