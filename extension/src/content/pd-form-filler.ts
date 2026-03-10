// SC "Report a Violation" 페이지 — 폼 자동 채우기 + 자동 제출 content script
// F13a: 폼 채우기 + 사람 Submit (기존)
// F13b: 폼 채우기 + 카운트다운 + 사람행동모방 + 자동 Submit (신규)

import { SC_SELECTORS } from './sc-selectors'
import { showCountdown } from './sc-countdown'
import { humanSubmit, delay } from './sc-human-behavior'
import { markItem } from './pd-queue'
import { API_BASE } from '@shared/constants'
import type { PdSubmitData } from '@shared/types'

// --- 설정 타입 ---

type PdAutoSettings = {
  autoSubmitEnabled: boolean
  countdownSeconds: number
  minDelaySec: number
  maxDelaySec: number
}

// --- 유틸리티 ---

const trySelectors = <T>(selectors: readonly (() => T | null | undefined)[]): T | null => {
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

const getStoredToken = (): Promise<string | null> =>
  new Promise((resolve) => {
    chrome.storage.local.get(['auth.access_token'], (result) => {
      resolve((result['auth.access_token'] as string) ?? null)
    })
  })

const getSettings = (): Promise<PdAutoSettings> =>
  new Promise((resolve) => {
    chrome.storage.local.get(['pd_auto_settings'], (result) => {
      resolve((result.pd_auto_settings as PdAutoSettings) ?? {
        autoSubmitEnabled: true,
        countdownSeconds: 3,
        minDelaySec: 30,
        maxDelaySec: 60,
      })
    })
  })

// --- API 호출 ---

const fetchPendingSubmitData = async (): Promise<{
  report_id: string
  pd_submit_data: PdSubmitData
  auto_submit_enabled: boolean
  countdown_seconds?: number
  min_delay_sec?: number
  max_delay_sec?: number
} | null> => {
  try {
    const token = await getStoredToken()
    if (!token) return null

    const res = await fetch(`${API_BASE}/reports/pending-pd-submit`, {
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

const confirmSubmitted = async (
  reportId: string,
  caseId: string | null,
  autoSubmit: boolean = false,
  autoSubmitSuccess: boolean = true,
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
        pd_case_id: caseId ?? undefined,
        auto_submit: autoSubmit || undefined,
        auto_submit_success: autoSubmit ? autoSubmitSuccess : undefined,
      }),
    })
  } catch {
    // fire-and-forget
  }
}

// --- 폼 채우기 (기존 F13a) ---

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

const setSelectValue = (el: HTMLSelectElement, value: string): void => {
  el.value = value
  el.dispatchEvent(new Event('change', { bubbles: true }))
}

const fillForm = (data: PdSubmitData): boolean => {
  let allFilled = true

  const asinInput = trySelectors(SC_SELECTORS.asinInput)
  if (asinInput) {
    setInputValue(asinInput, data.asin)
  } else {
    allFilled = false
  }

  const violationSelect = trySelectors(SC_SELECTORS.violationTypeSelect)
  if (violationSelect) {
    setSelectValue(violationSelect, data.violation_type_pd)
  } else {
    allFilled = false
  }

  const descTextarea = trySelectors(SC_SELECTORS.descriptionTextarea)
  if (descTextarea) {
    setInputValue(descTextarea, data.description)
  } else {
    allFilled = false
  }

  if (data.evidence_urls.length > 0) {
    const evidenceInput = trySelectors(SC_SELECTORS.evidenceInput)
    if (evidenceInput) {
      setInputValue(evidenceInput, data.evidence_urls.join('\n'))
    }
  }

  return allFilled
}

// --- 토스트 UI ---

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

// --- 제출 결과 감지 ---

const waitForResult = (timeoutMs: number): Promise<'success' | 'error' | 'timeout'> => {
  return new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      if (trySelectors(SC_SELECTORS.submissionConfirm)) {
        observer.disconnect()
        resolve('success')
        return
      }
      if (trySelectors(SC_SELECTORS.errorMessage)) {
        observer.disconnect()
        resolve('error')
        return
      }
    })

    observer.observe(document.body, { childList: true, subtree: true })

    // URL 변경 감시 (성공 시 페이지 이동)
    const startUrl = window.location.href
    const urlCheck = setInterval(() => {
      if (window.location.href !== startUrl) {
        const confirmEl = trySelectors(SC_SELECTORS.submissionConfirm)
        if (confirmEl) {
          clearInterval(urlCheck)
          observer.disconnect()
          resolve('success')
        }
      }
    }, 1000)

    setTimeout(() => {
      observer.disconnect()
      clearInterval(urlCheck)
      resolve('timeout')
    }, timeoutMs)
  })
}

const observeSubmission = (reportId: string): void => {
  let currentUrl = window.location.href

  const urlCheckInterval = setInterval(() => {
    if (window.location.href !== currentUrl) {
      currentUrl = window.location.href
      const confirmEl = trySelectors(SC_SELECTORS.submissionConfirm)
      if (confirmEl) {
        clearInterval(urlCheckInterval)
        observer.disconnect()
        handleManualSubmissionComplete(reportId)
      }
    }
  }, 1000)

  const observer = new MutationObserver(() => {
    const confirmEl = trySelectors(SC_SELECTORS.submissionConfirm)
    if (confirmEl) {
      observer.disconnect()
      clearInterval(urlCheckInterval)
      handleManualSubmissionComplete(reportId)
    }
  })

  observer.observe(document.body, { childList: true, subtree: true })

  setTimeout(() => {
    observer.disconnect()
    clearInterval(urlCheckInterval)
  }, 5 * 60 * 1000)
}

const handleManualSubmissionComplete = async (reportId: string): Promise<void> => {
  const caseId = trySelectors(SC_SELECTORS.caseId)
  await confirmSubmitted(reportId, caseId, false)
  showToast(
    `PD 제출 완료!${caseId ? ` Case ID: ${caseId}` : ''}`,
    'success',
  )
}

// --- 자동 제출 (F13b) ---

const attemptAutoSubmit = async (
  reportId: string,
  maxRetries: number = 2,
): Promise<boolean> => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const submitBtn = trySelectors(SC_SELECTORS.submitButton)
    if (!submitBtn) {
      showToast('Submit 버튼을 찾을 수 없습니다. 수동으로 제출하세요.', 'warning')
      return false
    }

    await humanSubmit(submitBtn)

    const result = await waitForResult(30_000)

    if (result === 'success') {
      const caseId = trySelectors(SC_SELECTORS.caseId)
      await confirmSubmitted(reportId, caseId, true, true)
      await markItem(reportId, 'done')
      return true
    }

    if (result === 'error' && attempt < maxRetries) {
      showToast(`제출 실패 (${attempt + 1}/${maxRetries + 1}). 재시도 중...`, 'warning')
      await delay(2000, 4000)
      continue
    }
  }

  showToast('자동 제출 실패. 수동으로 제출하세요.', 'error')
  await markItem(reportId, 'failed')
  await confirmSubmitted(reportId, null, true, false)
  return false
}

// --- 메인 초기화 ---

const init = async (): Promise<void> => {
  // 1. SC RAV 페이지 감지
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
  if (!pendingData) return

  // 4. 폼 채우기
  const allFilled = fillForm(pendingData.pd_submit_data)

  if (!allFilled) {
    showToast('일부 필드를 채우지 못했습니다. 수동으로 확인하세요.', 'warning')
    observeSubmission(pendingData.report_id)
    return
  }

  // 5. 자동 제출 모드 확인
  const localSettings = await getSettings()
  const webAutoEnabled = pendingData.auto_submit_enabled ?? false
  const localAutoEnabled = localSettings.autoSubmitEnabled

  if (!webAutoEnabled || !localAutoEnabled) {
    // F13a 동작: 폼만 채우고 사용자에게 안내
    showToast('폼 채우기 완료. 확인 후 Submit 클릭하세요.', 'success')
    observeSubmission(pendingData.report_id)
    return
  }

  // 6. 카운트다운 (웹 설정 우선, 없으면 로컬 fallback)
  const countdown = pendingData.countdown_seconds ?? localSettings.countdownSeconds
  const countdownResult = await showCountdown(countdown)

  if (countdownResult === 'cancelled') {
    showToast('자동 제출 취소. 수동으로 Submit 클릭하세요.', 'warning')
    observeSubmission(pendingData.report_id)
    return
  }

  // 7. 자동 제출
  const success = await attemptAutoSubmit(pendingData.report_id)

  if (success) {
    showToast('SC 자동 제출 완료!', 'success')
  }
}

init()
