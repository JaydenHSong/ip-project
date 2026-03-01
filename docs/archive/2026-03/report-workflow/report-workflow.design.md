# Design: Report Approval Workflow & State Lifecycle

> **Feature**: report-workflow
> **Plan**: `docs/01-plan/features/report-workflow.plan.md`
> **Requirements**: F12 (검토/승인 워크플로우), F20a (상태 라이프사이클), F30 (AI 강화 재신고)
> **Created**: 2026-03-01
> **Status**: Draft

---

## 1. State Machine

### 1.1 전체 상태 전환 다이어그램

```
                    ┌──────────────┐
                    │    draft     │
                    └──────┬───────┘
                           │ submit-review
                           ▼
                    ┌──────────────┐
              ┌─────│ pending_review│─────┐
              │     └──────────────┘     │
              │ approve                   │ reject
              ▼                           ▼
       ┌──────────┐              ┌──────────┐
       │ approved  │              │ rejected │
       └─────┬────┘              └─────┬────┘
             │ submit-sc               │ rewrite (→ draft)
             ▼                         ▼
       ┌──────────┐              ┌──────────┐
       │ submitted │              │  draft   │ (재제출 가능)
       └──────────┘              └──────────┘

  ※ cancel: draft / pending_review / approved → cancelled
```

### 1.2 상태 전환 규칙

| From | To | Action | API | 권한 |
|------|----|--------|-----|------|
| draft | pending_review | Submit for Review | `POST /api/reports/[id]/submit-review` | editor, admin |
| pending_review | approved | Approve | `POST /api/reports/[id]/approve` (기존) | editor, admin |
| pending_review | rejected | Reject | `POST /api/reports/[id]/reject` (기존) | editor, admin |
| rejected | draft | Rewrite | `POST /api/ai/rewrite` (기존) | editor, admin |
| approved | submitted | Submit to SC | `POST /api/reports/[id]/submit-sc` | admin |
| draft/pending_review/approved | cancelled | Cancel | `POST /api/reports/[id]/cancel` (기존) | editor, admin |

### 1.3 상태별 허용 액션

| Status | 허용 액션 (editor/admin) | 허용 액션 (admin only) |
|--------|--------------------------|----------------------|
| draft | Submit for Review, Edit Draft, Cancel, Rewrite | - |
| pending_review | Approve, Reject, Edit Draft, Cancel, Rewrite | - |
| approved | Cancel | Submit to SC |
| rejected | Rewrite, Cancel | - |
| submitted | (없음) | (없음) |
| cancelled | (없음) | (없음) |
| monitoring~resolved | (없음, MS3) | (없음, MS3) |

---

## 2. API Endpoints

### 2.1 [신규] POST /api/reports/[id]/submit-review

**목적**: draft → pending_review 상태 전환

**파일**: `src/app/api/reports/[id]/submit-review/route.ts`

**패턴**: 기존 `approve/route.ts`와 동일한 withAuth 패턴

```typescript
// Request: 없음 (POST body 없음)
// Response: { id, status: 'pending_review', updated_at }

// 로직:
// 1. 현재 상태가 'draft'인지 확인 (rejected도 직접 submit-review 허용)
// 2. draft_title + draft_body 존재 확인 (빈 드래프트 제출 방지)
// 3. status → 'pending_review' 업데이트
// 4. notifyDraftReady() 호출 (비동기, 실패 무시)

// 허용 상태: 'draft', 'rejected'
// 권한: editor, admin
```

**Validation Rules**:
- `status`가 `draft` 또는 `rejected`가 아니면 400
- `draft_title`이 null이거나 빈 문자열이면 400
- `draft_body`가 null이거나 빈 문자열이면 400

### 2.2 [신규] POST /api/reports/[id]/submit-sc

**목적**: approved → submitted 상태 전환 (실제 SC 자동화는 F13a)

**파일**: `src/app/api/reports/[id]/submit-sc/route.ts`

```typescript
// Request: 없음 (POST body 없음)
// Response: { id, status: 'submitted', sc_submitted_at }

// 로직:
// 1. 현재 상태가 'approved'인지 확인
// 2. status → 'submitted', sc_submitted_at → now 업데이트
// 3. notifySubmittedToSC() 호출 (비동기)

// 허용 상태: 'approved'
// 권한: admin only
```

### 2.3 [기존] POST /api/reports/[id]/approve — 수정 없음

현재 구현 (`approve/route.ts:35`):
- 허용 상태: `draft`, `pending_review` → `approved`
- 선택적 직접 수정 (`edited_draft_body`, `edited_draft_title`)
- `original_draft_body` 보존

**추가 동작 (학습 트리거)**:
- approve 핸들러 내부에서 `original_draft_body !== draft_body`일 때
- 비동기로 `POST /api/ai/learn` 호출 (내부 fetch, fire-and-forget)
- 실패해도 approve 응답에 영향 없음

### 2.4 [기존] POST /api/reports/[id]/reject — 수정 없음

현재 구현 (`reject/route.ts`):
- 허용 상태: `draft`, `pending_review` → `rejected`
- 필수: `rejection_reason` + `rejection_category`
- 6개 rejection_category 중 하나 선택 필수

### 2.5 [기존] POST /api/reports/[id]/cancel — 수정 없음

현재 구현 (`cancel/route.ts`):
- 허용 상태: `draft`, `pending_review`, `approved` → `cancelled`
- 선택: `cancellation_reason`

### 2.6 [기존] PATCH /api/reports/[id] — 수정 없음

현재 구현 (`route.ts:38`):
- 허용 필드: `draft_title`, `draft_body`, `user_violation_type`, `violation_category`, `confirmed_violation_type`
- 권한: editor, admin

### 2.7 [기존] POST /api/ai/rewrite — 수정 없음

현재 구현 (`ai/rewrite/route.ts`):
- `report_id` + `feedback` → Claude Sonnet 재작성
- `original_draft_body` 자동 보존
- 결과로 DB 업데이트 + `status → 'draft'`

---

## 3. Notification Functions

### 3.1 기존 함수 (수정 없음)

**파일**: `src/lib/notifications/google-chat.ts`

| 함수 | 용도 | 호출 시점 |
|------|------|-----------|
| `sendGoogleChatMessage(text)` | 베이스 전송 | 내부 |
| `notifyNewSubmission(asin, title, source)` | 새 리스팅 접수 | Extension/Crawler 접수 시 |
| `notifyDraftReady(reportId, asin, violationType)` | 검토 필요 | submit-review 시 |

### 3.2 신규 함수

```typescript
// 승인 알림
const notifyApproved = async (
  reportId: string,
  asin: string,
): Promise<void> => {
  const text = [
    `✅ *[Sentinel]* 신고서 승인됨`,
    `Report: ${reportId} | ASIN: ${asin}`,
    `→ SC 신고 제출이 가능합니다.`,
  ].join('\n')
  await sendGoogleChatMessage(text)
}

// 반려 알림
const notifyRejected = async (
  reportId: string,
  asin: string,
  reason: string,
): Promise<void> => {
  const text = [
    `❌ *[Sentinel]* 신고서 반려됨`,
    `Report: ${reportId} | ASIN: ${asin}`,
    `사유: ${reason.slice(0, 100)}${reason.length > 100 ? '...' : ''}`,
  ].join('\n')
  await sendGoogleChatMessage(text)
}

// SC 접수 알림
const notifySubmittedToSC = async (
  reportId: string,
  asin: string,
): Promise<void> => {
  const text = [
    `📮 *[Sentinel]* SC 신고 접수됨`,
    `Report: ${reportId} | ASIN: ${asin}`,
    `→ Seller Central에 접수되었습니다.`,
  ].join('\n')
  await sendGoogleChatMessage(text)
}
```

**Export**: 기존 export에 3개 함수 추가

---

## 4. UI Components

### 4.1 ReportActions.tsx — 핸들러 실연결

**파일**: `src/app/(protected)/reports/[id]/ReportActions.tsx`

현재: 모든 핸들러가 stub (`router.refresh()`)
변경: 실제 API fetch 호출로 교체

#### 4.1.1 handleSubmitReview

```typescript
const handleSubmitReview = async () => {
  setLoading('submitReview')
  try {
    const res = await fetch(`/api/reports/${reportId}/submit-review`, {
      method: 'POST',
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error?.message ?? 'Submit failed')
    }
    router.refresh()
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Failed')
  } finally {
    setLoading(null)
  }
}
```

#### 4.1.2 handleApprove

```typescript
const handleApprove = async () => {
  setLoading('approve')
  try {
    const res = await fetch(`/api/reports/${reportId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error?.message ?? 'Approve failed')
    }
    router.refresh()
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Failed')
  } finally {
    setLoading(null)
  }
}
```

#### 4.1.3 handleRewrite

```typescript
const handleRewrite = async () => {
  if (!feedback.trim()) return
  setLoading('rewrite')
  try {
    const res = await fetch('/api/ai/rewrite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        report_id: reportId,
        feedback: feedback.trim(),
      }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error?.message ?? 'Rewrite failed')
    }
    setShowRewriteModal(false)
    setFeedback('')
    router.refresh()
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Failed')
  } finally {
    setLoading(null)
  }
}
```

#### 4.1.4 handleCancel

```typescript
const handleCancel = async () => {
  if (!cancelReason.trim()) return
  setLoading('cancel')
  try {
    const res = await fetch(`/api/reports/${reportId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cancellation_reason: cancelReason.trim(),
      }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error?.message ?? 'Cancel failed')
    }
    setShowCancelModal(false)
    setCancelReason('')
    router.refresh()
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Failed')
  } finally {
    setLoading(null)
  }
}
```

#### 4.1.5 handleSubmitSC

```typescript
const handleSubmitSC = async () => {
  setLoading('submitSC')
  try {
    const res = await fetch(`/api/reports/${reportId}/submit-sc`, {
      method: 'POST',
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error?.message ?? 'Submit to SC failed')
    }
    router.refresh()
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Failed')
  } finally {
    setLoading(null)
  }
}
```

### 4.2 ReportActions.tsx — Reject UI 추가

현재: Reject 버튼이 없음 (pending_review에서 Approve + Rewrite만 표시)
추가: Reject 버튼 + Reject 모달 (rejection_category 선택 필수)

#### 4.2.1 Reject 버튼 추가 위치

```tsx
{status === 'pending_review' && (
  <>
    <Button size="sm" loading={loading === 'approve'} onClick={handleApprove}>
      {t('reports.detail.approve')}
    </Button>
    {/* 신규: Reject 버튼 */}
    <Button
      variant="outline"
      size="sm"
      onClick={() => setShowRejectModal(true)}
    >
      {t('reports.detail.reject')}
    </Button>
    <Button variant="outline" size="sm" onClick={() => setShowRewriteModal(true)}>
      {t('reports.detail.rewrite')}
    </Button>
  </>
)}
```

#### 4.2.2 Reject 모달

```tsx
// 추가 state
const [showRejectModal, setShowRejectModal] = useState(false)
const [rejectionCategory, setRejectionCategory] = useState('')
const [rejectionReason, setRejectionReason] = useState('')

// 모달 UI
<Modal
  open={showRejectModal}
  onClose={() => setShowRejectModal(false)}
  title={t('reports.detail.reject')}
>
  {/* Rejection Category — 라디오 6개 */}
  <fieldset className="space-y-2 mb-4">
    <legend className="text-sm font-medium text-th-text-secondary mb-2">
      {t('reports.detail.rejectionCategory')}
    </legend>
    {REJECTION_CATEGORIES.map((cat) => (
      <label key={cat} className="flex items-center gap-2 cursor-pointer">
        <input
          type="radio"
          name="rejection_category"
          value={cat}
          checked={rejectionCategory === cat}
          onChange={(e) => setRejectionCategory(e.target.value)}
          className="accent-th-accent"
        />
        <span className="text-sm text-th-text">
          {t(`reports.detail.rejectionCategories.${cat}`)}
        </span>
      </label>
    ))}
  </fieldset>

  {/* Rejection Reason — 필수 Textarea */}
  <Textarea
    label={t('reports.detail.rejectionReasonLabel')}
    value={rejectionReason}
    onChange={(e) => setRejectionReason(e.target.value)}
    rows={3}
    required
  />

  <div className="mt-4 flex justify-end gap-3">
    <Button variant="ghost" size="sm" onClick={() => setShowRejectModal(false)}>
      {t('common.cancel')}
    </Button>
    <Button
      variant="danger"
      size="sm"
      loading={loading === 'reject'}
      disabled={!rejectionCategory || !rejectionReason.trim()}
      onClick={handleReject}
    >
      {t('reports.detail.rejectConfirm')}
    </Button>
  </div>
</Modal>
```

#### 4.2.3 handleReject

```typescript
const handleReject = async () => {
  if (!rejectionCategory || !rejectionReason.trim()) return
  setLoading('reject')
  try {
    const res = await fetch(`/api/reports/${reportId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rejection_reason: rejectionReason.trim(),
        rejection_category: rejectionCategory,
      }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error?.message ?? 'Reject failed')
    }
    setShowRejectModal(false)
    setRejectionCategory('')
    setRejectionReason('')
    router.refresh()
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Failed')
  } finally {
    setLoading(null)
  }
}
```

### 4.3 ReportActions.tsx — Cancel 버튼 표시 조건

현재: 모든 상태에서 Cancel 표시 (잘못됨)
수정: `draft`, `pending_review`, `approved` 상태에서만 표시

```tsx
{['draft', 'pending_review', 'approved'].includes(status) && (
  <Button variant="danger" size="sm" onClick={() => setShowCancelModal(true)}>
    {t('reports.detail.cancelReport')}
  </Button>
)}
```

### 4.4 ReportDetailContent.tsx — handleSave 실연결

**파일**: `src/app/(protected)/reports/[id]/ReportDetailContent.tsx:57`

현재: stub (`router.refresh()`)
수정:

```typescript
const handleSave = async () => {
  setSaving(true)
  try {
    const res = await fetch(`/api/reports/${report.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        draft_title: editTitle,
        draft_body: editBody,
      }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error?.message ?? 'Save failed')
    }
    router.refresh()
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Failed')
  } finally {
    setSaving(false)
  }
}
```

### 4.5 ReportActions.tsx — rejected 상태에서 Rewrite 버튼

현재: `pending_review`에서만 Rewrite 표시
추가: `rejected` 상태에서도 Rewrite + Submit for Review 표시

```tsx
{status === 'rejected' && (
  <>
    <Button
      variant="outline"
      size="sm"
      onClick={() => setShowRewriteModal(true)}
    >
      {t('reports.detail.rewrite')}
    </Button>
    <Button
      size="sm"
      loading={loading === 'submitReview'}
      onClick={handleSubmitReview}
    >
      {t('reports.detail.submitReview')}
    </Button>
  </>
)}
```

---

## 5. Opus Learning Trigger

### 5.1 approve 핸들러에서 학습 호출

**파일**: `src/app/api/reports/[id]/approve/route.ts`

approve 성공 후, `original_draft_body`와 현재 `draft_body`가 다르면 학습 트리거:

```typescript
// approve 성공 응답 직전에 추가
const wasEdited = !!body.edited_draft_body || !!body.edited_draft_title
const originalBody = report.draft_body

// 비동기 학습 (fire-and-forget)
if (wasEdited || (data.id && originalBody)) {
  // 응답 후 비동기로 실행 (실패해도 무시)
  const baseUrl = req.nextUrl.origin
  fetch(`${baseUrl}/api/ai/learn`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: req.headers.get('cookie') ?? '',
    },
    body: JSON.stringify({ report_id: id }),
  }).catch(() => {
    // 학습 실패는 무시
  })
}
```

**조건**: `/api/ai/learn`이 내부적으로 `original_draft_body !== draft_body`를 다시 확인하므로 여기서는 단순 트리거만 수행.

---

## 6. i18n Keys

### 6.1 신규 키 (en.ts / ko.ts)

**위치**: `reports.detail` 네임스페이스 내

| Key | English | Korean |
|-----|---------|--------|
| `reject` | `Reject` | `반려` |
| `rejectConfirm` | `Reject Report` | `신고 반려` |
| `rejectionCategory` | `Rejection Category` | `반려 카테고리` |
| `rejectionReasonLabel` | `Rejection Reason (required)` | `반려 사유 (필수)` |
| `rejectionCategories.insufficient_evidence` | `Insufficient Evidence` | `증거 불충분` |
| `rejectionCategories.wrong_violation_type` | `Wrong Violation Type` | `위반 유형 오류` |
| `rejectionCategories.inaccurate_policy_reference` | `Inaccurate Policy Reference` | `정책 참조 부정확` |
| `rejectionCategories.over_detection` | `Over Detection (False Positive)` | `과잉 탐지 (거짓 양성)` |
| `rejectionCategories.duplicate` | `Duplicate Report` | `중복 신고` |
| `rejectionCategories.other` | `Other` | `기타` |

### 6.2 기존 키 (이미 있음, 수정 불필요)

`approve`, `rewrite`, `submitReview`, `submitSC`, `cancelReport`, `cancelConfirm`, `rewriteFeedback`, `rewriteConfirm`, `cancelReason`, `saveChanges`, `editing` — 모두 이미 존재

---

## 7. Notification Integration Points

### 7.1 API별 알림 호출 위치

| API Route | 알림 함수 | 호출 위치 |
|-----------|-----------|-----------|
| `submit-review/route.ts` | `notifyDraftReady(reportId, asin, violationType)` | status 업데이트 후 |
| `approve/route.ts` | `notifyApproved(reportId, asin)` | approve 성공 후 |
| `reject/route.ts` | `notifyRejected(reportId, asin, reason)` | reject 성공 후 |
| `submit-sc/route.ts` | `notifySubmittedToSC(reportId, asin)` | status 업데이트 후 |

### 7.2 알림 호출 패턴

모든 알림은 fire-and-forget 패턴:

```typescript
// DB 업데이트 성공 후, 응답 반환 전
notifyApproved(id, listing.asin).catch(() => {
  // 알림 실패는 메인 로직에 영향 없음
})
```

ASIN 조회: submit-review와 submit-sc에서는 report의 `listing_id`로 listings 테이블 조회 필요.

---

## 8. Implementation Order

### Phase A: API 신설 (2 files)

| # | 항목 | 파일 | 설명 |
|---|------|------|------|
| A1 | submit-review route | `src/app/api/reports/[id]/submit-review/route.ts` | draft→pending_review |
| A2 | submit-sc route | `src/app/api/reports/[id]/submit-sc/route.ts` | approved→submitted |

### Phase B: Notification 확장 (1 file)

| # | 항목 | 파일 | 설명 |
|---|------|------|------|
| B1 | 알림 함수 추가 | `src/lib/notifications/google-chat.ts` | notifyApproved, notifyRejected, notifySubmittedToSC |

### Phase C: i18n 키 추가 (2 files)

| # | 항목 | 파일 | 설명 |
|---|------|------|------|
| C1 | English keys | `src/lib/i18n/locales/en.ts` | reject 관련 12개 키 |
| C2 | Korean keys | `src/lib/i18n/locales/ko.ts` | reject 관련 12개 키 |

### Phase D: UI 핸들러 연결 (2 files)

| # | 항목 | 파일 | 설명 |
|---|------|------|------|
| D1 | ReportActions 전체 핸들러 | `src/app/(protected)/reports/[id]/ReportActions.tsx` | 6개 핸들러 + Reject UI + 상태별 버튼 조건 |
| D2 | handleSave 연결 | `src/app/(protected)/reports/[id]/ReportDetailContent.tsx` | PATCH API 호출 |

### Phase E: 학습 트리거 + 알림 연결 (3 files)

| # | 항목 | 파일 | 설명 |
|---|------|------|------|
| E1 | approve 학습 트리거 | `src/app/api/reports/[id]/approve/route.ts` | /api/ai/learn 비동기 호출 |
| E2 | approve/reject 알림 | `src/app/api/reports/[id]/approve/route.ts`, `reject/route.ts` | notifyApproved/notifyRejected 호출 |
| E3 | submit-review/sc 알림 | `submit-review/route.ts`, `submit-sc/route.ts` | notifyDraftReady/notifySubmittedToSC 호출 |

### Total: 10 items, 8 files (2 new + 6 modified)

---

## 9. File Change Summary

| File | Action | Changes |
|------|--------|---------|
| `src/app/api/reports/[id]/submit-review/route.ts` | **NEW** | draft/rejected → pending_review + 알림 |
| `src/app/api/reports/[id]/submit-sc/route.ts` | **NEW** | approved → submitted + 알림 |
| `src/lib/notifications/google-chat.ts` | MODIFY | +3 함수 (notifyApproved, notifyRejected, notifySubmittedToSC) |
| `src/lib/i18n/locales/en.ts` | MODIFY | +12 키 (reject 관련) |
| `src/lib/i18n/locales/ko.ts` | MODIFY | +12 키 (reject 관련) |
| `src/app/(protected)/reports/[id]/ReportActions.tsx` | MODIFY | 6 핸들러 실연결 + Reject 모달 + 상태별 조건 |
| `src/app/(protected)/reports/[id]/ReportDetailContent.tsx` | MODIFY | handleSave PATCH 연결 |
| `src/app/api/reports/[id]/approve/route.ts` | MODIFY | 학습 트리거 + 알림 호출 |
| `src/app/api/reports/[id]/reject/route.ts` | MODIFY | 알림 호출 추가 |

---

## 10. Type Dependencies

### 10.1 import 필요 (ReportActions.tsx)

```typescript
import { REJECTION_CATEGORIES } from '@/types/reports'
```

### 10.2 API Request/Response 타입 (기존)

- `ApproveReportRequest` (`src/types/api.ts:70`) — 이미 있음
- `RejectReportRequest` (`src/types/api.ts:75`) — 이미 있음
- submit-review, submit-sc — body 없음, 별도 타입 불필요

---

## 11. Success Criteria

| # | 기준 | 검증 방법 |
|---|------|-----------|
| SC-1 | Draft → Submit Review → Approve → Submit SC 전체 흐름 | UI에서 상태 전환 + DB 확인 |
| SC-2 | Reject (사유+카테고리) 흐름 | Reject 모달에서 6개 카테고리 선택 + 사유 입력 |
| SC-3 | Cancel 흐름 | draft/pending_review/approved에서만 Cancel 표시 |
| SC-4 | Rewrite (AI 재작성) 흐름 | 피드백 입력 → API 호출 → 새 드래프트 반영 |
| SC-5 | Draft 편집 Save | PATCH API로 draft_title/draft_body 저장 |
| SC-6 | Rejected → Rewrite → Re-submit | rejected 상태에서 Rewrite + Submit for Review |
| SC-7 | TypeScript typecheck PASS | `pnpm typecheck` 에러 0 |
| SC-8 | Google Chat 알림 발송 | approve/reject/submit-review/submit-sc 시 알림 |
| SC-9 | Opus 학습 트리거 | approve 시 /api/ai/learn 호출 확인 |
