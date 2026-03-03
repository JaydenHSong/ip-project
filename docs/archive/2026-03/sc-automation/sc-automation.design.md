# SC 완전 자동 신고 (F13b) Design Document

> **Summary**: Extension이 SC 폼 채우기 + Submit 자동 클릭 + 결과 감지까지 수행하는 완전 자동 파이프라인. 카운트다운 오버레이, 사람 행동 모방, 배치 큐, 재시도, Web 설정 UI를 포함.
>
> **Project**: Sentinel
> **Version**: 0.1
> **Author**: Claude (AI)
> **Date**: 2026-03-03
> **Status**: Draft
> **Plan Reference**: `docs/01-plan/features/sc-automation.plan.md`

---

## 1. Architecture Overview

### 1.1 기존 흐름 (F13a) vs 신규 흐름 (F13b)

```
F13a (반자동):
  Web [Submit to SC] → SC 탭 열림 → Extension 폼 채우기 → 사람이 Submit 클릭 → Extension 감지 → 콜백

F13b (자동):
  Web [Submit to SC] → SC 탭 열림 → Extension 폼 채우기
    → [자동모드 ON] → 카운트다운(3초) → 사람행동모방 → 자동 Submit 클릭 → 결과 감지 → 콜백
    → [자동모드 OFF] → 기존 F13a 동작 유지
    → [배치 큐] → 다음 건 대기(30~60초 랜덤) → 반복
```

### 1.2 컴포넌트 다이어그램

```
┌─────────────────────────────────┐
│ Sentinel Web (Next.js)          │
│ ┌─────────────────────────────┐ │
│ │ Settings                    │ │
│ │ ├ MonitoringSettings        │ │
│ │ ├ TemplatesTab              │ │
│ │ ├ ScAutomationSettings (NEW)│ │
│ │ └ UserManagement            │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ API                         │ │
│ │ ├ settings/sc-automation    │ │
│ │ │   GET/PUT (NEW)           │ │
│ │ ├ reports/:id/submit-sc     │ │
│ │ │   (기존, 변경 없음)         │ │
│ │ ├ reports/pending-sc-submit │ │
│ │ │   (기존, auto_submit 플래그 추가) │
│ │ └ reports/:id/confirm-submitted │
│ │     (기존, 감사 로그 액션 확장)  │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
         │ API 호출
         ▼
┌─────────────────────────────────┐
│ Sentinel Extension (Chrome MV3) │
│ ┌─────────────────────────────┐ │
│ │ SC Content Script           │ │
│ │ ├ sc-form-filler.ts (수정)   │ │
│ │ │   init → fillForm          │ │
│ │ │   → maybeAutoSubmit (NEW)  │ │
│ │ ├ sc-selectors.ts (수정)     │ │
│ │ │   submitButton 셀렉터 강화  │ │
│ │ ├ sc-countdown.ts (NEW)     │ │
│ │ │   카운트다운 오버레이 UI     │ │
│ │ ├ sc-human-behavior.ts (NEW)│ │
│ │ │   마우스/스크롤/딜레이 모방   │ │
│ │ └ sc-queue.ts (NEW)         │ │
│ │     배치 큐 + 딜레이 관리      │ │
│ ├─────────────────────────────┤ │
│ │ Popup (설정 추가)            │ │
│ │   자동 제출 ON/OFF 토글       │ │
│ │   딜레이 설정 (30/60/90초)    │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

---

## 2. Detailed Design

### 2.1 Extension — sc-selectors.ts (수정)

**변경**: `submitButton` 셀렉터 다중 fallback 강화, `errorMessage` 셀렉터 추가.

```typescript
// sc-selectors.ts — 추가/수정 셀렉터

export const SC_SELECTORS = {
  // ... 기존 셀렉터 유지 ...

  // Submit 버튼 — 다중 fallback (기존 2개 → 5개)
  submitButton: [
    () => document.querySelector<HTMLButtonElement>('button[type="submit"]'),
    () => document.querySelector<HTMLButtonElement>('[data-testid="submit-button"]'),
    () => document.querySelector<HTMLButtonElement>('input[type="submit"]'),
    () => {
      // 텍스트 매칭: "Submit", "Report", "Send"
      const buttons = document.querySelectorAll<HTMLButtonElement>('button')
      for (const btn of buttons) {
        const text = btn.textContent?.trim().toLowerCase() ?? ''
        if (text === 'submit' || text === 'report' || text.includes('submit report')) {
          return btn
        }
      }
      return null
    },
    () => document.querySelector<HTMLButtonElement>('.submit-button, .btn-submit'),
  ],

  // 에러 메시지 감지 (NEW)
  errorMessage: [
    () => document.querySelector('.error-message, .alert-danger, .alert-error'),
    () => {
      const els = document.querySelectorAll('.error, [role="alert"]')
      for (const el of els) {
        if (el.textContent && el.textContent.trim().length > 0) return el
      }
      return null
    },
  ],
}
```

### 2.2 Extension — sc-human-behavior.ts (신규)

**목적**: 봇 탐지 방지를 위한 사람 행동 시뮬레이션 모듈.

```typescript
// sc-human-behavior.ts

// 랜덤 딜레이 (ms)
export const delay = (min: number, max: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, min + Math.random() * (max - min)))

// 랜덤 스크롤 (px 범위)
export const randomScroll = async (minY: number, maxY: number): Promise<void> => {
  const targetY = minY + Math.random() * (maxY - minY)
  window.scrollTo({ top: targetY, behavior: 'smooth' })
  await delay(300, 800)
}

// 마우스 이동 시뮬레이션 (대상 요소 근처)
export const moveMouseNear = async (el: HTMLElement): Promise<void> => {
  const rect = el.getBoundingClientRect()
  const event = new MouseEvent('mousemove', {
    clientX: rect.left + rect.width / 2 + (Math.random() - 0.5) * 20,
    clientY: rect.top + rect.height / 2 + (Math.random() - 0.5) * 10,
    bubbles: true,
  })
  document.dispatchEvent(event)
  await delay(200, 600)
}

// 자연스러운 클릭 (offset + 딜레이)
export const naturalClick = async (el: HTMLElement): Promise<void> => {
  const rect = el.getBoundingClientRect()
  const x = rect.left + rect.width / 2 + (Math.random() - 0.5) * 6
  const y = rect.top + rect.height / 2 + (Math.random() - 0.5) * 4

  el.dispatchEvent(new MouseEvent('mousedown', { clientX: x, clientY: y, bubbles: true }))
  await delay(50, 150)
  el.dispatchEvent(new MouseEvent('mouseup', { clientX: x, clientY: y, bubbles: true }))
  await delay(10, 50)
  el.dispatchEvent(new MouseEvent('click', { clientX: x, clientY: y, bubbles: true }))
}

// 전체 사람 행동 시퀀스 (폼 하단 스크롤 → 마우스 이동 → 클릭)
export const humanSubmit = async (submitButton: HTMLElement): Promise<void> => {
  await randomScroll(400, 800)
  await delay(500, 1500)
  await moveMouseNear(submitButton)
  await delay(300, 800)
  await naturalClick(submitButton)
}
```

### 2.3 Extension — sc-countdown.ts (신규)

**목적**: 자동 제출 전 카운트다운 오버레이 UI. Cancel 클릭 시 수동 모드 전환.

```typescript
// sc-countdown.ts

type CountdownResult = 'proceed' | 'cancelled'

export const showCountdown = (seconds: number): Promise<CountdownResult> => {
  return new Promise((resolve) => {
    let remaining = seconds
    let cancelled = false

    // 오버레이 컨테이너
    const overlay = document.createElement('div')
    Object.assign(overlay.style, {
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      padding: '16px 24px',
      borderRadius: '12px',
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      color: '#fff',
      fontSize: '14px',
      fontFamily: '-apple-system, sans-serif',
      zIndex: '99999',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
    })

    // 카운트 텍스트
    const textEl = document.createElement('span')
    textEl.textContent = `Sentinel: 자동 제출 ${remaining}초...`

    // Cancel 버튼
    const cancelBtn = document.createElement('button')
    cancelBtn.textContent = 'Cancel'
    Object.assign(cancelBtn.style, {
      padding: '4px 12px',
      borderRadius: '6px',
      border: '1px solid rgba(255,255,255,0.3)',
      backgroundColor: 'transparent',
      color: '#fff',
      fontSize: '13px',
      cursor: 'pointer',
    })
    cancelBtn.addEventListener('click', () => {
      cancelled = true
      overlay.remove()
      resolve('cancelled')
    })

    overlay.appendChild(textEl)
    overlay.appendChild(cancelBtn)
    document.body.appendChild(overlay)

    // 카운트다운 타이머
    const timer = setInterval(() => {
      if (cancelled) {
        clearInterval(timer)
        return
      }
      remaining--
      textEl.textContent = `Sentinel: 자동 제출 ${remaining}초...`

      if (remaining <= 0) {
        clearInterval(timer)
        overlay.remove()
        resolve('proceed')
      }
    }, 1000)
  })
}
```

### 2.4 Extension — sc-queue.ts (신규)

**목적**: 여러 건 승인 시 순차 자동 제출 큐 관리.

```typescript
// sc-queue.ts

type QueueItem = {
  reportId: string
  status: 'pending' | 'processing' | 'done' | 'failed'
}

type QueueState = {
  items: QueueItem[]
  processing: boolean
}

const STORAGE_KEY = 'sentinel_sc_queue'

// chrome.storage에서 큐 로드
export const loadQueue = async (): Promise<QueueState> => {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      resolve(result[STORAGE_KEY] ?? { items: [], processing: false })
    })
  })
}

// chrome.storage에 큐 저장
export const saveQueue = async (state: QueueState): Promise<void> => {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: state }, resolve)
  })
}

// 큐에 아이템 추가
export const enqueue = async (reportId: string): Promise<void> => {
  const state = await loadQueue()
  if (state.items.some((item) => item.reportId === reportId)) return // 중복 방지
  state.items.push({ reportId, status: 'pending' })
  await saveQueue(state)
}

// 다음 대기 아이템 가져오기
export const dequeue = async (): Promise<QueueItem | null> => {
  const state = await loadQueue()
  const next = state.items.find((item) => item.status === 'pending')
  if (!next) return null
  next.status = 'processing'
  state.processing = true
  await saveQueue(state)
  return next
}

// 완료/실패 마킹
export const markItem = async (
  reportId: string,
  status: 'done' | 'failed',
): Promise<void> => {
  const state = await loadQueue()
  const item = state.items.find((i) => i.reportId === reportId)
  if (item) item.status = status
  state.processing = false
  await saveQueue(state)
}

// 랜덤 딜레이 (30~60초)
export const getRandomDelay = (minSec: number, maxSec: number): number =>
  (minSec + Math.random() * (maxSec - minSec)) * 1000

// 큐 상태 요약 (popup 뱃지용)
export const getQueueSummary = async (): Promise<{
  total: number
  pending: number
  done: number
  failed: number
}> => {
  const state = await loadQueue()
  return {
    total: state.items.length,
    pending: state.items.filter((i) => i.status === 'pending').length,
    done: state.items.filter((i) => i.status === 'done').length,
    failed: state.items.filter((i) => i.status === 'failed').length,
  }
}

// 큐 초기화
export const clearQueue = async (): Promise<void> => {
  await saveQueue({ items: [], processing: false })
}
```

### 2.5 Extension — sc-form-filler.ts (수정)

**핵심 변경**: `init()` 함수에 자동 제출 로직 추가. 설정 조회 → 카운트다운 → 사람 행동 모방 → Submit 클릭 → 결과 감지 → 재시도.

```typescript
// sc-form-filler.ts — 수정 부분만 표시

import { showCountdown } from './sc-countdown'
import { humanSubmit, delay } from './sc-human-behavior'
import { markItem, getRandomDelay } from './sc-queue'

// Extension 설정 조회
type ScAutoSettings = {
  autoSubmitEnabled: boolean
  countdownSeconds: number
  minDelaySec: number
  maxDelaySec: number
}

const getSettings = (): Promise<ScAutoSettings> =>
  new Promise((resolve) => {
    chrome.storage.local.get(['sc_auto_settings'], (result) => {
      resolve(result.sc_auto_settings ?? {
        autoSubmitEnabled: false,
        countdownSeconds: 3,
        minDelaySec: 30,
        maxDelaySec: 60,
      })
    })
  })

// 자동 제출 시도 (재시도 포함)
const attemptAutoSubmit = async (reportId: string, maxRetries: number = 2): Promise<boolean> => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const submitBtn = trySelectors(SC_SELECTORS.submitButton)
    if (!submitBtn) {
      showToast('Submit 버튼을 찾을 수 없습니다. 수동으로 제출하세요.', 'warning')
      return false
    }

    // 사람 행동 모방 후 클릭
    await humanSubmit(submitBtn)

    // 결과 대기 (최대 30초)
    const result = await waitForResult(30_000)

    if (result === 'success') {
      await handleSubmissionComplete(reportId)
      await markItem(reportId, 'done')
      return true
    }

    if (result === 'error' && attempt < maxRetries) {
      showToast(`제출 실패 (${attempt + 1}/${maxRetries + 1}). 재시도 중...`, 'warning')
      await delay(2000, 4000)
      continue
    }
  }

  // 모든 재시도 실패
  showToast('자동 제출 실패. 수동으로 제출하세요.', 'error')
  await markItem(reportId, 'failed')
  await logSubmitResult(reportId, false)
  return false
}

// 제출 결과 대기
const waitForResult = (timeoutMs: number): Promise<'success' | 'error' | 'timeout'> => {
  return new Promise((resolve) => {
    const startTime = Date.now()

    const observer = new MutationObserver(() => {
      // 성공 감지
      if (trySelectors(SC_SELECTORS.submissionConfirm)) {
        observer.disconnect()
        resolve('success')
        return
      }
      // 에러 감지
      if (trySelectors(SC_SELECTORS.errorMessage)) {
        observer.disconnect()
        resolve('error')
        return
      }
    })

    observer.observe(document.body, { childList: true, subtree: true })

    // 타임아웃
    setTimeout(() => {
      observer.disconnect()
      resolve('timeout')
    }, timeoutMs)
  })
}

// 감사 로그 전송
const logSubmitResult = async (reportId: string, success: boolean): Promise<void> => {
  try {
    const token = await getStoredToken()
    if (!token) return
    await fetch(`${API_BASE}/reports/${reportId}/confirm-submitted`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        auto_submit: true,
        auto_submit_success: success,
      }),
    })
  } catch {
    // fire-and-forget
  }
}

// init() — 수정: 자동 제출 모드 분기 추가
const init = async (): Promise<void> => {
  // 1~4: 기존과 동일 (페이지 감지, 로그인 확인, 데이터 조회, 폼 채우기)
  const isRavPage = trySelectors(SC_SELECTORS.pageDetect)
  if (!isRavPage) return

  const isLoggedIn = trySelectors(SC_SELECTORS.loginDetect)
  if (!isLoggedIn) {
    showToast('SC에 로그인하세요.', 'warning')
    return
  }

  const pendingData = await fetchPendingSubmitData()
  if (!pendingData) return

  const allFilled = fillForm(pendingData.sc_submit_data)

  if (!allFilled) {
    showToast('일부 필드를 채우지 못했습니다. 수동으로 확인하세요.', 'warning')
    observeSubmission(pendingData.report_id) // 기존 수동 감지
    return
  }

  // 5. 자동 제출 모드 확인 (NEW)
  const settings = await getSettings()

  if (!settings.autoSubmitEnabled) {
    // 기존 F13a 동작: 폼만 채우고 사용자에게 안내
    showToast('폼 채우기 완료. 확인 후 Submit 클릭하세요.', 'success')
    observeSubmission(pendingData.report_id)
    return
  }

  // 6. 카운트다운 표시 (NEW)
  const countdownResult = await showCountdown(settings.countdownSeconds)

  if (countdownResult === 'cancelled') {
    showToast('자동 제출 취소. 수동으로 Submit 클릭하세요.', 'warning')
    observeSubmission(pendingData.report_id)
    return
  }

  // 7. 자동 제출 (NEW)
  const success = await attemptAutoSubmit(pendingData.report_id)

  if (success) {
    showToast('SC 자동 제출 완료!', 'success')
  }
}
```

### 2.6 Extension — popup 설정 (수정)

**목적**: popup.html에 Settings 뷰 추가, 자동 제출 ON/OFF + 딜레이 설정.

**popup.html 변경**: Settings 뷰 추가.

```html
<!-- popup.html — 추가 -->
<div id="view-settings" class="view">
  <!-- SettingsView injected here -->
</div>
```

**popup.ts 변경**: settings 뷰 + 기어 아이콘 라우팅.

**views/SettingsView.ts (신규)**:

```typescript
// views/SettingsView.ts
export const renderSettingsView = (
  container: HTMLElement,
  onBack: () => void,
): void => {
  // chrome.storage에서 설정 로드
  chrome.storage.local.get(['sc_auto_settings'], (result) => {
    const settings = result.sc_auto_settings ?? {
      autoSubmitEnabled: false,
      countdownSeconds: 3,
      minDelaySec: 30,
      maxDelaySec: 60,
    }

    container.innerHTML = `
      <div class="settings-view">
        <div class="settings-view__header">
          <button id="btn-back" class="btn-icon">← Back</button>
          <h2>SC Auto Submit</h2>
        </div>
        <div class="settings-view__body">
          <label class="settings-toggle">
            <input type="checkbox" id="auto-submit-toggle"
              ${settings.autoSubmitEnabled ? 'checked' : ''} />
            <span>Auto Submit Enabled</span>
          </label>
          <label class="settings-field">
            <span>Countdown (seconds)</span>
            <select id="countdown-select">
              <option value="3" ${settings.countdownSeconds === 3 ? 'selected' : ''}>3s</option>
              <option value="5" ${settings.countdownSeconds === 5 ? 'selected' : ''}>5s</option>
              <option value="10" ${settings.countdownSeconds === 10 ? 'selected' : ''}>10s</option>
            </select>
          </label>
          <label class="settings-field">
            <span>Batch Delay (seconds)</span>
            <select id="delay-select">
              <option value="30" ${settings.minDelaySec === 30 ? 'selected' : ''}>30~60s</option>
              <option value="60" ${settings.minDelaySec === 60 ? 'selected' : ''}>60~90s</option>
              <option value="90" ${settings.minDelaySec === 90 ? 'selected' : ''}>90~120s</option>
            </select>
          </label>
        </div>
      </div>
    `

    // 이벤트 바인딩
    container.querySelector('#btn-back')?.addEventListener('click', onBack)

    const saveSettings = (): void => {
      const toggle = container.querySelector<HTMLInputElement>('#auto-submit-toggle')
      const countdown = container.querySelector<HTMLSelectElement>('#countdown-select')
      const delayEl = container.querySelector<HTMLSelectElement>('#delay-select')
      const minDelay = Number(delayEl?.value ?? 30)

      chrome.storage.local.set({
        sc_auto_settings: {
          autoSubmitEnabled: toggle?.checked ?? false,
          countdownSeconds: Number(countdown?.value ?? 3),
          minDelaySec: minDelay,
          maxDelaySec: minDelay + 30,
        },
      })
    }

    container.querySelector('#auto-submit-toggle')?.addEventListener('change', saveSettings)
    container.querySelector('#countdown-select')?.addEventListener('change', saveSettings)
    container.querySelector('#delay-select')?.addEventListener('change', saveSettings)
  })
}
```

### 2.7 Web API — settings/sc-automation/route.ts (신규)

**패턴**: 기존 `settings/monitoring/route.ts`와 동일한 `system_configs` 테이블 패턴.

```typescript
// GET /api/settings/sc-automation → 설정 조회 (viewer+)
// PUT /api/settings/sc-automation → 설정 수정 (admin only)

// system_configs 키:
// - sc_auto_submit_enabled: boolean (기본 false)
// - sc_auto_submit_countdown: number (기본 3, 범위 3~10)
// - sc_auto_submit_min_delay: number (기본 30, 범위 30~120)
// - sc_auto_submit_max_delay: number (기본 60, 범위 60~150)

type ScAutomationSettings = {
  sc_auto_submit_enabled: boolean
  sc_auto_submit_countdown: number
  sc_auto_submit_min_delay: number
  sc_auto_submit_max_delay: number
}
```

**입력 검증**:
- `countdown`: 3~10초
- `min_delay`: 30~120초
- `max_delay`: min_delay+30 ~ 150초

### 2.8 Web API — pending-sc-submit (수정)

**변경**: 응답에 `auto_submit_enabled` 플래그 추가. Extension이 Web 설정과 동기화할 수 있도록.

```typescript
// GET /api/reports/pending-sc-submit
// 기존 응답:
//   { report_id, sc_submit_data }
// 변경 후:
//   { report_id, sc_submit_data, auto_submit_enabled }
```

Extension은 이 플래그와 로컬 `sc_auto_settings.autoSubmitEnabled` 둘 다 true일 때만 자동 제출 실행. (Web Admin이 전체 비활성화하면 Extension 설정과 관계없이 수동 모드.)

### 2.9 Web API — confirm-submitted (수정)

**변경**: 요청 body에 `auto_submit`, `auto_submit_success` 필드 추가. 감사 로그 액션 분기.

```typescript
// POST /api/reports/:id/confirm-submitted
// 기존 body: { sc_case_id? }
// 변경 후 body: { sc_case_id?, auto_submit?, auto_submit_success? }

// 감사 로그 액션:
// - auto_submit === true && auto_submit_success === true → 'sc_auto_submit_success'
// - auto_submit === true && auto_submit_success === false → 'sc_auto_submit_failed'
// - auto_submit 없음 (기존) → 'submitted_sc'
```

### 2.10 Web — ScAutomationSettings.tsx (신규)

**패턴**: 기존 `MonitoringSettings.tsx`와 동일 구조.

```
┌─────────────────────────────────────────┐
│ SC Auto Submit Settings                 │
├─────────────────────────────────────────┤
│                                         │
│  Auto Submit    [━━━━━━━━━━●] Enabled   │
│                                         │
│  Countdown        [3 seconds ▼]         │
│                                         │
│  Batch Delay      [30~60 sec ▼]         │
│                                         │
│  ⚠ Auto submit requires Extension      │
│    installed with SC permissions.        │
│                                         │
│  [Save]  ✓ Saved                        │
│                                         │
└─────────────────────────────────────────┘
```

**필드**:

| 필드 | 타입 | 기본값 | 범위 | Admin only |
|------|------|--------|------|:----------:|
| Auto Submit | toggle | OFF | — | O |
| Countdown | select | 3s | 3/5/10 | O |
| Batch Delay | select | 30~60s | 30~60/60~90/90~120 | O |

### 2.11 Web — SettingsContent.tsx (수정)

**변경**: `sc-automation` 탭 추가 (Admin 전용, Users 탭 앞에 배치).

```typescript
const ADMIN_TABS = ['monitoring', 'templates', 'sc-automation', 'users'] as const
type SettingsTab = 'monitoring' | 'templates' | 'sc-automation' | 'users'

// 탭 라벨:
// tab === 'sc-automation' ? t('settings.scAutomation.title') : ...

// 렌더링:
// {activeTab === 'sc-automation' && isAdmin && <ScAutomationSettings />}
```

### 2.12 i18n 키 추가

**en.ts**:
```typescript
settings: {
  // ... 기존 ...
  scAutomation: {
    title: 'SC Auto Submit',
    enabled: 'Auto Submit Enabled',
    disabled: 'Auto Submit Disabled',
    countdown: 'Countdown Before Submit',
    batchDelay: 'Batch Delay Between Submissions',
    warning: 'Auto submit requires Sentinel Extension with SC permissions enabled.',
    save: 'Save',
    saved: 'Settings saved',
    seconds: 'seconds',
  },
}
```

**ko.ts**:
```typescript
settings: {
  // ... 기존 ...
  scAutomation: {
    title: 'SC 자동 제출',
    enabled: '자동 제출 활성화',
    disabled: '자동 제출 비활성화',
    countdown: '제출 전 카운트다운',
    batchDelay: '연속 제출 대기 시간',
    warning: '자동 제출은 SC 권한이 활성화된 Sentinel Extension이 필요합니다.',
    save: '저장',
    saved: '설정이 저장되었습니다',
    seconds: '초',
  },
}
```

### 2.13 데모 모드

**data.ts 변경**: `SC_AUTOMATION_SETTINGS` 데모 데이터 추가.

```typescript
export const DEMO_SC_AUTOMATION_SETTINGS = {
  sc_auto_submit_enabled: false,
  sc_auto_submit_countdown: 3,
  sc_auto_submit_min_delay: 30,
  sc_auto_submit_max_delay: 60,
}
```

---

## 3. Data Flow

### 3.1 설정 동기화 흐름

```
Admin → Web Settings UI → PUT /api/settings/sc-automation → system_configs 저장
                                                                    ↓
Extension → GET /api/reports/pending-sc-submit → auto_submit_enabled 확인
         ↓
Extension → chrome.storage.local (sc_auto_settings) → 로컬 설정 확인
         ↓
Both true → 자동 제출 모드 활성화
```

### 3.2 배치 제출 흐름

```
Web에서 3건 Submit to SC → 각각 sc_submit_data 저장

SC 탭 #1 열림 → Extension 활성화
  → pending-sc-submit → rpt-001 데이터 수신
  → 폼 채우기 → 카운트다운 → 자동 제출 → 성공
  → confirm-submitted (auto_submit: true)
  → 45초 대기 (랜덤 30~60)

SC 탭 #2 열림 (Extension이 자동 열거나, 수동)
  → pending-sc-submit → rpt-002 데이터 수신
  → 동일 과정 반복
```

> **주의**: Extension이 자동으로 새 탭을 여는 건 Phase A 범위에 포함하지 않음.
> 사용자가 Web에서 각 건의 "Submit to SC"를 클릭하여 탭을 열어야 함.
> Extension은 열린 SC 탭에서만 자동 제출 수행.

---

## 4. Implementation Checklist

| # | Task | File | Type | Depends |
|---|------|------|------|---------|
| 1 | sc-selectors.ts: submitButton 강화, errorMessage 추가 | `extension/src/content/sc-selectors.ts` | 수정 | — |
| 2 | sc-human-behavior.ts: 사람 행동 모방 모듈 | `extension/src/content/sc-human-behavior.ts` | 신규 | — |
| 3 | sc-countdown.ts: 카운트다운 오버레이 | `extension/src/content/sc-countdown.ts` | 신규 | — |
| 4 | sc-queue.ts: 배치 큐 관리 | `extension/src/content/sc-queue.ts` | 신규 | — |
| 5 | sc-form-filler.ts: 자동 제출 통합 | `extension/src/content/sc-form-filler.ts` | 수정 | 1,2,3,4 |
| 6 | popup — SettingsView.ts + popup.html/ts 수정 | `extension/src/popup/` | 신규+수정 | — |
| 7 | Web API: settings/sc-automation | `src/app/api/settings/sc-automation/route.ts` | 신규 | — |
| 8 | Web API: pending-sc-submit — auto_submit_enabled 추가 | `src/app/api/reports/pending-sc-submit/route.ts` | 수정 | 7 |
| 9 | Web API: confirm-submitted — 감사 로그 확장 | `src/app/api/reports/[id]/confirm-submitted/route.ts` | 수정 | — |
| 10 | ScAutomationSettings.tsx | `src/app/(protected)/settings/ScAutomationSettings.tsx` | 신규 | 7 |
| 11 | SettingsContent.tsx: sc-automation 탭 추가 | `src/app/(protected)/settings/SettingsContent.tsx` | 수정 | 10 |
| 12 | i18n EN/KO | `src/lib/i18n/locales/{en,ko}.ts` | 수정 | — |
| 13 | 데모 데이터 | `src/lib/demo/data.ts` | 수정 | — |
| 14 | 빌드 검증 | — | 검증 | All |

**구현 순서**: 1→2→3→4→5 (Extension 코어) → 6 (Extension 설정) → 7→8→9 (Web API) → 10→11 (Web UI) → 12→13 (i18n/데모) → 14 (검증)

---

## 5. Type Definitions

### 5.1 Extension Types

```typescript
// extension/src/shared/types.ts — 추가

type ScAutoSettings = {
  autoSubmitEnabled: boolean
  countdownSeconds: number  // 3 | 5 | 10
  minDelaySec: number       // 30 | 60 | 90
  maxDelaySec: number       // 60 | 90 | 120
}

type QueueItem = {
  reportId: string
  status: 'pending' | 'processing' | 'done' | 'failed'
}

type QueueState = {
  items: QueueItem[]
  processing: boolean
}
```

### 5.2 Web Types

```typescript
// src/types/sc-automation.ts — 신규

type ScAutomationSettings = {
  sc_auto_submit_enabled: boolean
  sc_auto_submit_countdown: number
  sc_auto_submit_min_delay: number
  sc_auto_submit_max_delay: number
}
```

---

## 6. Security Considerations

| 항목 | 설계 | 근거 |
|------|------|------|
| SC 자격증명 | 서버에 저장하지 않음 | Extension이 사용자 브라우저 세션 활용 |
| 자동 제출 권한 | Admin만 설정 가능 | RBAC — viewer/editor는 설정 변경 불가 |
| 카운트다운 취소 | 항상 Cancel 가능 | 잘못된 신고 방지 안전장치 |
| 속도 제한 | 최소 30초 딜레이 | 봇 탐지 방지, 설정에서도 30초 미만 불가 |
| 사람 승인 필수 | Approve 단계 건너뛰지 않음 | 자동 제출은 승인된 건만 대상 |
| 감사 추적 | 자동 제출 성공/실패 로그 | 문제 발생 시 추적 가능 |

---

## 7. Error Handling

| 시나리오 | 처리 |
|----------|------|
| Submit 버튼 못 찾음 | 토스트 경고 + 수동 모드 fallback |
| 제출 후 에러 페이지 | 재시도 (최대 2회), 실패 시 수동 fallback |
| 30초 타임아웃 | 수동 제출 안내 토스트 |
| SC 로그인 안 됨 | 로그인 안내 토스트 (기존 동작) |
| 네트워크 오류 (API 콜백) | fire-and-forget, Web에서 수동 "Confirm Submitted" 가능 |
| Extension 미설치 | 클립보드 복사 fallback (기존 F13a) |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-03 | Initial design — Extension 자동 제출 + Web 설정 + 배치 큐 | Claude (AI) |
