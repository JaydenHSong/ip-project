# AI Learning Pipeline - Design Document

> **Feature**: AI 분석 자동화 + Opus 학습 루프 + Auto-approve
>
> **Project**: Spigen Sentinel
> **Author**: Claude (AI)
> **Date**: 2026-03-04
> **Version**: 0.1
> **Plan Reference**: [ai-learning.plan.md](../../01-plan/features/ai-learning.plan.md)

---

## 1. Overview

기존에 완성된 AI 엔진 코드(19개 파일)를 프로덕션 파이프라인에 연결하는 "배선" 작업입니다.
신규 파일 2개 + 기존 파일 5개 수정으로 구성됩니다.

---

## 2. Implementation Items

### 2.1 FR-01: Crawler → AI 분석 자동 트리거

**파일**: `src/app/api/crawler/listings/batch/route.ts`

**현재 코드**: listings 저장 후 `{ created, duplicates, errors }` 반환만 함.

**변경**: `is_suspect=true`인 리스팅에 대해 AI 분석을 fire-and-forget으로 트리거.

```typescript
// 기존 코드 (line 87~89)
} else {
  created++
}

// 변경 후
} else {
  created++
  // FR-01: 의심 리스팅 → AI 분석 자동 트리거 (fire-and-forget)
  if (is_suspect) {
    // listing ID가 필요하므로 insert 시 select('id') 추가
    triggerAiAnalysis(req, insertedId, 'crawler')
  }
}
```

**핵심 변경사항**:
1. `supabase.from('listings').insert(...)` → `.insert(...).select('id').single()` 로 변경하여 listing ID 획득
2. `triggerAiAnalysis()` 헬퍼 함수 추가 (같은 파일 내)

```typescript
const triggerAiAnalysis = (req: NextRequest, listingId: string, source: string): void => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
    ?? req.nextUrl.origin

  fetch(`${baseUrl}/api/ai/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.CRAWLER_SERVICE_TOKEN}`,
    },
    body: JSON.stringify({
      listing_id: listingId,
      async: true,
      source,
      priority: 'normal',
    }),
  }).catch(() => {
    // fire-and-forget — 실패해도 listing 저장에 영향 없음
  })
}
```

**주의**: `/api/ai/analyze`는 현재 `withAuth(['editor', 'admin'])`로 보호됨. Crawler 서비스 토큰으로도 호출 가능하도록 인증 수정 필요 → 2.6절 참조.

---

### 2.2 FR-02: Extension → AI 분석 자동 트리거

**파일**: `src/app/api/ext/submit-report/route.ts`

**현재 코드**: Report 생성 후 `{ report_id, listing_id, is_duplicate }` 반환. AI 분석은 미호출.

**변경**: Report 생성 후 AI 분석 fire-and-forget 추가 (line 146 이후).

```typescript
// 4. 스크린샷 업로드 (기존) ...

// 5. AI 분석 자동 트리거 (FR-02, 신규)
if (!isDuplicate) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin
  fetch(`${baseUrl}/api/ai/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: req.headers.get('cookie') ?? '',
    },
    body: JSON.stringify({
      listing_id: listingId,
      async: true,
      source: 'extension',
      priority: 'high',
      violation_type: violation_type,
    }),
  }).catch(() => {})
}

const response: SubmitReportResponse = { ... }
```

**Extension 사용자는 이미 인증된 세션**이므로 cookie 전달로 충분. 별도 인증 변경 불필요.

---

### 2.3 FR-04: Report 승인 → Opus 학습 (이미 구현됨)

**파일**: `src/app/api/reports/[id]/approve/route.ts`

**현재 상태**: 이미 line 85~98에서 Opus 학습을 fire-and-forget으로 호출 중.

```typescript
// 이미 구현됨 (line 85-98)
if (wasEdited || bodyChanged) {
  fetch(`${baseUrl}/api/ai/learn`, { ... }).catch(() => {})
}
```

**검증 포인트**:
- `original_draft_body` 컬럼에 AI 초기 드래프트 저장 → `processAiAnalysis`의 Step 5에서 `original_draft_body: draft.draft_body` 설정 (line 126) → 확인 완료
- Opus `/api/ai/learn` 라우트 → `learn.ts` → Skill 문서 업데이트 → 확인 완료
- **추가 변경 불필요**

---

### 2.4 FR-05 + FR-06: Auto-approve 설정 UI + 로직

#### 2.4.1 DB: system_configs 활용

Auto-approve 설정을 `system_configs` 테이블에 저장:

```json
{
  "key": "auto_approve",
  "value": {
    "enabled": false,
    "threshold": 90,
    "types": {}
  }
}
```

`types` 객체: 위반 코드 → boolean 매핑. 키가 없으면 false로 처리.

**초기값**: `enabled: false` → 안전하게 시작.

#### 2.4.2 API: Auto-approve 설정 CRUD

**새 파일**: `src/app/api/settings/auto-approve/route.ts`

```typescript
// GET — 현재 설정 반환
// PUT — 설정 업데이트 (admin only)

type AutoApproveConfig = {
  enabled: boolean
  threshold: number  // 50~100
  types: Record<string, boolean>  // e.g., { V05: true, V08: true }
}
```

#### 2.4.3 UI 컴포넌트

**새 파일**: `src/app/(protected)/settings/AutoApproveSettings.tsx`

```
┌─────────────────────────────────────────────────────┐
│ Auto-approve Settings                                │
├─────────────────────────────────────────────────────┤
│                                                      │
│ ◉ Enable Auto-approve (Global)        [Toggle OFF]   │
│                                                      │
│ Confidence Threshold: ━━━━━━━●━━ 90%                │
│                                                      │
│ ─── Violation Types ───────────────────────────────  │
│                                                      │
│ ⚠ IP Violations (manual review recommended)          │
│ □ V01 Trademark Infringement                         │
│ □ V02 Copyright/Image Theft                          │
│ □ V03 Patent Infringement                            │
│ □ V04 Counterfeit                                    │
│                                                      │
│ Listing Content                                      │
│ ☑ V05 False/Misleading Claims                       │
│ ☑ V06 Restricted Keywords                           │
│ □ V07 Inaccurate Product Info                        │
│ ☑ V08 Image Policy Violation                        │
│ □ V09 Comparative Advertising                        │
│ ☑ V10 Variation Policy                              │
│                                                      │
│ Review Manipulation                                  │
│ □ V11 Review Manipulation                            │
│ □ V12 Review Hijacking                               │
│                                                      │
│ ... (V13~V19)                                        │
│                                                      │
│                              [Save Settings]         │
└─────────────────────────────────────────────────────┘
```

**IP 관련 (V01~V04)**: 경고 배지 표시 "수동 검토 권장". 토글은 가능하지만 위험 안내.

#### 2.4.4 Auto-approve 로직 적용

**파일**: `src/lib/ai/job-processor.ts`

Step 5 (reports INSERT) 이후에 auto-approve 체크 추가:

```typescript
// [Step 5] reports INSERT (기존)
const reportId = await deps.supabaseInsertReport(reportData)

// [Step 5.5] Auto-approve 체크 (신규)
if (deps.autoApproveConfig?.enabled) {
  const violationType = primaryViolation.type
  const confidence = primaryViolation.confidence
  const typeEnabled = deps.autoApproveConfig.types[violationType] === true

  if (typeEnabled && confidence >= deps.autoApproveConfig.threshold) {
    await deps.supabaseUpdateReportStatus(reportId, 'approved')
    // auto-approved 표시 — approved_by: 'system'
  }
}
```

**ProcessDependencies 타입 확장**:

```typescript
type ProcessDependencies = {
  // ... 기존 필드
  autoApproveConfig: AutoApproveConfig | null
  supabaseUpdateReportStatus: (id: string, status: string) => Promise<void>
}
```

**호출측 (`/api/ai/analyze`)**: `system_configs`에서 auto_approve 설정을 읽어 deps에 전달.

---

### 2.5 Settings 탭 추가

**파일**: `src/app/(protected)/settings/SettingsContent.tsx`

```typescript
// 변경: 탭 목록에 'auto-approve' 추가
const ADMIN_TABS = ['monitoring', 'sc-automation', 'auto-approve', 'templates', 'users'] as const
type SettingsTab = 'monitoring' | 'sc-automation' | 'auto-approve' | 'templates' | 'users'

// 렌더링 추가
{activeTab === 'auto-approve' && <AutoApproveSettings />}
```

**탭 라벨 i18n 키**: `settings.autoApprove.title`

---

### 2.6 AI Analyze 인증 확장

**파일**: `src/app/api/ai/analyze/route.ts`

현재 `withAuth(['editor', 'admin'])` — Crawler 서비스 토큰으로 호출 불가.

**해결**: 듀얼 인증 패턴 적용 — 사용자 세션 OR 서비스 토큰.

```typescript
// 변경 전
export const POST = withAuth(async (req: NextRequest) => { ... }, ['editor', 'admin'])

// 변경 후
import { withDualAuth } from '@/lib/auth/dual-middleware'

export const POST = withDualAuth(async (req: NextRequest) => { ... }, ['editor', 'admin'])
```

**새 파일**: `src/lib/auth/dual-middleware.ts`

```typescript
// 1. Authorization: Bearer 토큰 있으면 → 서비스 토큰 검증 (CRAWLER_SERVICE_TOKEN)
// 2. 없으면 → 기존 withAuth 로직 (Supabase 세션 쿠키)

import { withAuth } from './middleware'
import { withServiceAuth } from './service-middleware'

export const withDualAuth = (
  handler: (req: NextRequest) => Promise<NextResponse>,
  roles: string[],
) => {
  return async (req: NextRequest) => {
    const authHeader = req.headers.get('authorization')

    if (authHeader?.startsWith('Bearer ')) {
      // 서비스 토큰 모드
      return withServiceAuth(handler)(req)
    }

    // 사용자 세션 모드
    return withAuth(handler, roles)(req)
  }
}
```

---

### 2.7 i18n 번역 추가

**파일**: `src/lib/i18n/locales/en.ts`, `ko.ts`

```typescript
settings: {
  // ... 기존
  autoApprove: {
    title: 'Auto-approve',
    description: 'Automatically approve reports when AI confidence exceeds the threshold.',
    enableAutoApprove: 'Enable Auto-approve (Global)',
    threshold: 'Confidence Threshold',
    thresholdDesc: 'Reports with AI confidence above this value will be auto-approved.',
    violationTypes: 'Violation Types',
    ipWarning: 'IP violations — Manual review recommended',
    save: 'Save Settings',
    saved: 'Settings saved.',
  },
}
```

```typescript
settings: {
  // ... 기존
  autoApprove: {
    title: '자동 승인',
    description: 'AI 신뢰도가 임계값을 초과하면 자동으로 승인합니다.',
    enableAutoApprove: '자동 승인 활성화 (전역)',
    threshold: '신뢰도 임계값',
    thresholdDesc: '이 값 이상의 AI 신뢰도를 가진 신고가 자동 승인됩니다.',
    violationTypes: '위반 유형',
    ipWarning: 'IP 위반 — 수동 검토 권장',
    save: '설정 저장',
    saved: '설정이 저장되었습니다.',
  },
}
```

---

## 3. File Change Summary

### 3.1 새 파일 (3개)

| # | 파일 | 용도 |
|---|------|------|
| 1 | `src/lib/auth/dual-middleware.ts` | 서비스 토큰 / 사용자 세션 듀얼 인증 |
| 2 | `src/app/api/settings/auto-approve/route.ts` | Auto-approve 설정 CRUD API |
| 3 | `src/app/(protected)/settings/AutoApproveSettings.tsx` | Auto-approve 설정 UI |

### 3.2 수정 파일 (6개)

| # | 파일 | 변경 내용 |
|---|------|----------|
| 1 | `src/app/api/crawler/listings/batch/route.ts` | AI 분석 자동 트리거 추가 |
| 2 | `src/app/api/ext/submit-report/route.ts` | AI 분석 자동 트리거 추가 |
| 3 | `src/app/api/ai/analyze/route.ts` | `withAuth` → `withDualAuth` + auto-approve config 전달 |
| 4 | `src/lib/ai/job-processor.ts` | Auto-approve 로직 + deps 타입 확장 |
| 5 | `src/app/(protected)/settings/SettingsContent.tsx` | 'auto-approve' 탭 추가 |
| 6 | `src/lib/i18n/locales/en.ts` + `ko.ts` | settings.autoApprove 번역 |

### 3.3 변경 없음 (검증 완료)

| # | 파일 | 이유 |
|---|------|------|
| 1 | `src/app/api/reports/[id]/approve/route.ts` | Opus 학습 이미 구현 (line 85-98) |
| 2 | `src/lib/ai/learn.ts` | Opus 학습 로직 이미 완성 |
| 3 | `src/lib/ai/analyze.ts` | Sonnet 분석 로직 이미 완성 |
| 4 | `src/lib/ai/draft.ts` | 드래프트 생성 이미 완성 |
| 5 | `skills/V01~V19.md` | 기본 시드 완료, Opus가 자동 업데이트 |

---

## 4. Implementation Order

```
Phase 1: 자동 트리거 (FR-01, FR-02)
  1. dual-middleware.ts 생성
  2. /api/ai/analyze — withDualAuth 적용
  3. /api/crawler/listings/batch — AI 트리거 추가
  4. /api/ext/submit-report — AI 트리거 추가
  5. ANTHROPIC_API_KEY 환경변수 설정

Phase 2: Auto-approve (FR-05, FR-06)
  6. /api/settings/auto-approve API 생성
  7. AutoApproveSettings.tsx UI 생성
  8. SettingsContent.tsx 탭 추가
  9. job-processor.ts auto-approve 로직 추가
  10. /api/ai/analyze — auto-approve config 전달

Phase 3: i18n
  11. en.ts + ko.ts 번역 추가
```

---

## 5. Edge Cases

| 시나리오 | 처리 |
|----------|------|
| ANTHROPIC_API_KEY 미설정 | `/api/ai/analyze`에서 500 에러 → 리스팅 저장은 성공, AI만 스킵 |
| Redis 미연결 (BullMQ 불가) | 동기 모드로 fallback (기 구현) |
| AI 분석 중 타임아웃 | fire-and-forget이므로 호출측 영향 없음 |
| 중복 리스팅의 AI 분석 | listings/batch에서 duplicate 시 AI 트리거 안 함 |
| Auto-approve ON이지만 disagreement 발생 | `user_violation_type ≠ ai_violation_type` → auto-approve 스킵 → Review Queue |
| Auto-approve 후 Opus 학습 | auto-approve는 draft 수정 없음 → Opus 학습 트리거 안 됨 (정상) |

---

## 6. Testing Checklist

| # | 테스트 | 방법 |
|---|--------|------|
| 1 | Crawler → AI 트리거 | 의심 리스팅 배치 전송 → Report(draft) 생성 확인 |
| 2 | Extension → AI 트리거 | Extension 제보 → AI 분석 결과 Report에 반영 확인 |
| 3 | Opus 학습 호출 | Report 수정 후 승인 → Skill 문서 변경 확인 |
| 4 | Auto-approve OFF | 기본 상태에서 모든 Report가 Review Queue로 가는지 확인 |
| 5 | Auto-approve ON | threshold 이상 confidence → 자동 승인 확인 |
| 6 | API 키 미설정 | 500 에러 반환, listing 저장은 정상 |
| 7 | 듀얼 인증 | 서비스 토큰으로 /api/ai/analyze 호출 성공 |
| 8 | 듀얼 인증 | 쿠키 세션으로 /api/ai/analyze 호출 성공 |
| 9 | i18n | 영어/한국어 토글 시 Auto-approve 설정 텍스트 확인 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-04 | Initial design | Claude (AI) |
