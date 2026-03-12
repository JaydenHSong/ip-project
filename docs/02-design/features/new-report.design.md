# Design: New Report Flow Redesign

## Status: APPROVED
## Created: 2026-03-12
## Plan: [new-report.plan.md](../../01-plan/features/new-report.plan.md)

---

## 1. 아키텍처

### 1.1 컴포넌트 구조

```
ReportsContent.tsx
  └── NewReportModal (새 모달 컴포넌트)
        ├── Step 1: ASIN + Marketplace 입력
        ├── Step 2: 로딩 (Extension 대기)
        └── Step 3: 에러/타임아웃 → 수동 생성 fallback
```

### 1.2 API 흐름

```
1. [Modal] POST /api/reports/create-from-asin
   → { asin, marketplace }
   → extension_fetch_queue INSERT
   → 응답: { queue_id }

2. [Modal] GET /api/ext/fetch-status/:queueId (폴링, 1초 간격, 최대 10회)
   → { status: 'pending' | 'processing' | 'completed' | 'failed', result? }

3a. [completed] → listing 정보 획득 → POST /api/reports/manual (간소화)
   → { asin, marketplace, listing_id } → Draft 생성
   → 응답: { report_id }
   → navigate(/reports/:report_id)

3b. [timeout/failed] → 경고 팝업
   → "수동 생성" 클릭 시: POST /api/reports/manual (최소 정보)
   → navigate(/reports/:report_id)
```

## 2. 구현 상세

### 2.1 NewReportModal 컴포넌트

**파일**: `src/components/features/NewReportModal.tsx`

```tsx
type NewReportModalProps = {
  open: boolean
  onClose: () => void
  onSuccess: (reportId: string) => void
}

// States: 'input' | 'loading' | 'timeout'
```

- **input**: ASIN 인풋 + Marketplace 드롭다운 + Create 버튼
- **loading**: 스피너 + "Extension에서 정보를 가져오는 중..." 메시지 + 경과 시간 표시
- **timeout**: 경고 아이콘 + "Extension이 응답하지 않습니다" + "수동 생성" 버튼

### 2.2 API: `/api/reports/create-from-asin`

**파일**: `src/app/api/reports/create-from-asin/route.ts`

```typescript
// POST - ASIN으로 리포트 생성 시작
// 1. 중복 체크 (같은 ASIN + 같은 marketplace에 활성 리포트)
// 2. extension_fetch_queue에 삽입
// 3. queue_id 반환

// 권한: owner, admin, editor
```

### 2.3 API: `/api/ext/fetch-status/[queueId]`

**파일**: `src/app/api/ext/fetch-status/[queueId]/route.ts`

```typescript
// GET - 큐 상태 확인 (폴링용)
// 응답: { status, result?, error? }
// result에 listing_id 포함 시 → 프론트에서 Draft 생성 진행
```

### 2.4 `/api/reports/manual` 수정

기존 필수 필드 완화:
- ~~`user_violation_type` (필수)~~ → 선택
- ~~`violation_category` (필수)~~ → 선택
- `asin` (필수) — 유지
- `listing_id` (선택) — 신규 추가, 있으면 listing 조회 생략

### 2.5 ReportsContent.tsx 변경

- `NewReportForm` import 제거
- `SlidePanel` (New Report) → `NewReportModal`로 교체
- `showNewReport` state 유지, 모달로만 변경

## 3. 구현 순서

1. `NewReportModal.tsx` 생성
2. `/api/reports/create-from-asin/route.ts` 생성
3. `/api/ext/fetch-status/[queueId]/route.ts` 생성
4. `/api/reports/manual/route.ts` 필수 필드 완화
5. `ReportsContent.tsx` — SlidePanel → Modal 교체
6. `/reports/new/` 디렉토리 삭제

## 4. UI 디자인

### Modal (Step: input)
```
┌─────────────────────────────┐
│ New Report              [X] │
├─────────────────────────────┤
│                             │
│  ASIN                       │
│  ┌───────────────────────┐  │
│  │ B0XXXXXXXXX           │  │
│  └───────────────────────┘  │
│                             │
│  Marketplace                │
│  ┌───────────────────────┐  │
│  │ US (United States) ▼  │  │
│  └───────────────────────┘  │
│                             │
│         [Cancel] [Create]   │
└─────────────────────────────┘
```

### Modal (Step: loading)
```
┌─────────────────────────────┐
│ New Report              [X] │
├─────────────────────────────┤
│                             │
│      ◌ (spinner)            │
│                             │
│  Extension에서 정보를       │
│  가져오는 중... (3초)        │
│                             │
│         [Cancel]            │
└─────────────────────────────┘
```

### Modal (Step: timeout)
```
┌─────────────────────────────┐
│ New Report              [X] │
├─────────────────────────────┤
│                             │
│  ⚠ Extension이 응답하지     │
│    않습니다.                 │
│                             │
│  Extension이 켜져 있는지     │
│  확인해주세요.               │
│                             │
│  [Cancel] [Create Manually] │
└─────────────────────────────┘
```
