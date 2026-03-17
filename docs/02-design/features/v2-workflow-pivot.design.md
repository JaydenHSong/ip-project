# v2 Workflow Pivot — Design

> **Feature**: Sentinel v2 워크플로우 대전환
> **Plan**: `docs/01-plan/features/v2-workflow-pivot.plan.md`
> **Created**: 2026-03-11
> **Phase**: Design
> **Miro Board**: https://miro.com/app/board/uXjVGzbA7VM=/

---

## 1. Architecture Overview

### 1.1 v1 → v2 구조 변경

```
v1:
  V01~V19 위반코드 → AI 분석 → AI 드래프트 → 승인 → PD+BR 동시 → 모니터링(30분+7일)

v2:
  BR 폼 타입 → 템플릿 매칭 → AI 톤 제안 → Admin 수정 → BR 제출만 → 모니터링(일2회)
```

### 1.2 BR 폼 타입 체계 (NEW — V01~V19 대체)

```typescript
// src/constants/br-form-types.ts (NEW — violations.ts 대체)
export const BR_FORM_TYPES = {
  ip_violation: {
    code: 'ip_violation',
    label: 'Report an IP Violation',
    amazonMenu: 'Report an Intellectual Property (IP) violation',
    fields: ['description'],
    note: '별도 Report a violation 도구 경유',
  },
  product_not_as_described: {
    code: 'product_not_as_described',
    label: 'Product Not as Described',
    amazonMenu: 'Report a store policy violation > Product not as described',
    fields: ['description', 'product_urls', 'seller_storefront_url', 'policy_url'],
  },
  incorrect_variation: {
    code: 'incorrect_variation',
    label: 'Incorrect Variation',
    amazonMenu: 'Report a store policy violation > Incorrect variation',
    fields: ['description', 'product_urls'],
  },
  product_review: {
    code: 'product_review',
    label: 'Product Review Violation',
    amazonMenu: 'Report a store policy violation > Product review violation',
    fields: ['description', 'asins', 'review_urls', 'order_id'],
  },
  other_policy: {
    code: 'other_policy',
    label: 'Other Policy Violations',
    amazonMenu: 'Report a store policy violation > Other policy violations',
    fields: ['description', 'product_urls', 'seller_storefront_url', 'policy_url'],
  },
  listing_issue: {
    code: 'listing_issue',
    label: 'Listing Issue',
    amazonMenu: 'Listing issue > Listing issue',
    fields: ['description', 'product_urls'],
  },
} as const

export type BrFormTypeCode = keyof typeof BR_FORM_TYPES
```

### 1.3 Extension 카테고리 ↔ BR 폼 타입 1:1 매핑

| Extension 1단 카테고리 | BR 폼 타입 코드 | Amazon 메뉴 경로 |
|----------------------|----------------|-----------------|
| IP (Trademark/Copyright/Patent) | `ip_violation` | Report an IP violation |
| Product not as described | `product_not_as_described` | Store policy > Product not as described |
| Incorrect variation | `incorrect_variation` | Store policy > Incorrect variation |
| Product review violation | `product_review` | Store policy > Product review violation |
| Other policy violations | `other_policy` | Store policy > Other policy violations |
| Listing issue | `listing_issue` | Listing issue |

---

## 2. DB Schema Changes

### 2.1 reports 테이블 변경

```sql
-- Phase 1: 새 컬럼 추가
ALTER TABLE reports ADD COLUMN br_form_type text;

-- Phase 2: 기존 데이터 마이그레이션 (V코드 → BR 폼 타입)
UPDATE reports SET br_form_type = CASE
  WHEN violation_type IN ('V01', 'V02', 'V03') THEN 'ip_violation'
  WHEN violation_type = 'V04' THEN 'other_policy'
  WHEN violation_type IN ('V05', 'V06', 'V07', 'V08', 'V09') THEN 'other_policy'
  WHEN violation_type = 'V10' THEN 'incorrect_variation'
  WHEN violation_type IN ('V11', 'V12') THEN 'product_review'
  WHEN violation_type IN ('V13', 'V14', 'V15') THEN 'other_policy'
  WHEN violation_type IN ('V16', 'V17', 'V18', 'V19') THEN 'other_policy'
  -- Extension v1.7.0 카테고리 (V코드가 아닌 것들)
  WHEN violation_type = 'variation' THEN 'incorrect_variation'
  WHEN violation_type = 'main_image' THEN 'other_policy'
  WHEN violation_type = 'wrong_category' THEN 'other_policy'
  WHEN violation_type = 'pre_announcement' THEN 'listing_issue'
  WHEN violation_type = 'review_violation' THEN 'product_review'
  WHEN violation_type = 'intellectual_property' THEN 'ip_violation'
  ELSE 'other_policy'
END;

-- Phase 3: 레거시 컬럼은 일단 유지 (롤백 안전망)
-- violation_type, violation_category, user_violation_type 등은 deprecated 처리
-- 코드에서만 br_form_type 사용, 3개월 후 컬럼 삭제 예정

-- Phase 4: 새 설정 추가
ALTER TABLE app_settings ADD COLUMN clone_threshold_days integer DEFAULT 15;
ALTER TABLE app_settings ADD COLUMN br_monitor_frequency text DEFAULT 'twice_daily';
```

### 2.2 report_templates 테이블 변경

```sql
-- 기존 violation_codes 컬럼 → br_form_type으로 통일
-- report_templates에 이미 br_form_type 컬럼 있음 (br-form-enhancement에서 추가됨)
-- category 컬럼을 br_form_type과 동기화

UPDATE report_templates SET br_form_type = CASE
  WHEN category = 'intellectual_property' THEN 'ip_violation'
  WHEN category = 'listing_content' AND br_form_type IS NULL THEN 'other_policy'
  WHEN category = 'review_manipulation' THEN 'product_review'
  WHEN category = 'selling_practice' THEN 'other_policy'
  WHEN category = 'regulatory_safety' THEN 'other_policy'
  ELSE COALESCE(br_form_type, 'other_policy')
END
WHERE br_form_type IS NULL OR br_form_type NOT IN (
  'ip_violation', 'product_not_as_described', 'incorrect_variation',
  'product_review', 'other_policy', 'listing_issue'
);
```

---

## 3. Code Changes by Phase

### Phase 1: 레거시 정리 + BR 폼 타입 통일

#### D1. `src/constants/br-form-types.ts` (NEW)
- BR_FORM_TYPES 상수 정의 (위 1.2 참조)
- BrFormTypeCode 타입 export
- BR_FORM_TYPE_OPTIONS (드롭다운용)
- getBrFormTypeLabel(), getBrFormTypeFields() 헬퍼

#### D2. `src/constants/violations.ts` (DELETE)
- 전체 삭제
- 모든 import 참조를 br-form-types.ts로 교체

#### D3. `src/types/reports.ts` 변경
```typescript
// BEFORE (삭제)
import type { ViolationCategory, ViolationCode } from '@/constants/violations'
user_violation_type: ViolationCode
ai_violation_type: ViolationCode | null
confirmed_violation_type: ViolationCode | null
violation_type: ViolationCode
violation_category: ViolationCategory
disagreement_flag: boolean

// AFTER (교체)
import type { BrFormTypeCode } from '@/constants/br-form-types'
br_form_type: BrFormTypeCode

// BrFormType 타입도 br-form-types.ts에서 import
// 기존 4개 → 6개로 확장
export type BrFormType = BrFormTypeCode
```

#### D4. `src/lib/reports/br-data.ts` 변경
```typescript
// BEFORE: BR_VIOLATION_MAP (V코드 → 폼타입 매핑)
// AFTER: 직접 br_form_type 사용 (매핑 불필요)

// isBrReportable → br_form_type이 있으면 true
export const isBrReportable = (formType: BrFormTypeCode): boolean =>
  formType !== 'ip_violation' // IP는 RAV 경로

// getBrFormType → 불필요 (이미 br_form_type이 직접 값)
// BR_VIOLATION_MAP → 삭제

// buildBrSubmitData → formType을 직접 받음
export const buildBrSubmitData = ({
  report, listing, extraFields
}: {
  report: { id: string; br_form_type: BrFormTypeCode; draft_body: string | null; draft_title: string | null }
  listing: { asin: string; url: string | null; seller_storefront_url?: string | null }
  extraFields?: BrExtraFields
}): BrSubmitData | null => {
  if (!isBrReportable(report.br_form_type)) return null
  // ... 기존 로직 유지, violation_type 참조만 br_form_type으로 교체
}
```

#### D5. PD 잔여 코드 정리
- `src/app/api/reports/[id]/confirm-submitted` → 이미 삭제됨 확인
- `src/app/api/reports/[id]/approve-submit` → 이미 삭제됨 확인
- `extension/src/content/front-auto-reporter.ts` → 이미 삭제됨 확인
- `extension/src/content/pd-form-filler.ts` → 이미 삭제됨 확인
- reports 타입에서 PD 관련 필드 deprecated 처리

#### D6. 참조 전수 교체
```
grep -r "violation_type\|ViolationCode\|ViolationCategory\|VIOLATION_" src/ --include="*.ts" --include="*.tsx"
```
- 모든 참조를 br_form_type / BrFormTypeCode로 교체
- UI의 위반 유형 필터/뱃지 → BR 폼 타입 기반으로 변경

### Phase 2: Admin 역할 확대 + 수집 경로

#### D7. Admin 수동 리포트 작성 (NEW)
```
POST /api/reports/manual
Body: {
  br_form_type: BrFormTypeCode
  asin?: string
  product_url?: string
  seller_name?: string
  draft_title: string
  draft_body: string
  extra_fields?: BrExtraFields
}
```
- 웹 UI: Reports 페이지에 "New Report" 버튼
- 모달/페이지: br_form_type 선택 → 필드 입력 → 저장 (draft 상태)
- listing_id 없이도 생성 가능 (수동이므로)

#### D8. AI 역할 축소
```typescript
// src/lib/ai/draft.ts 변경
// BEFORE: AI가 violation_type 기반으로 전체 드래프트 작성
// AFTER: AI는 기존 템플릿 body에 톤/매너 조정 제안만

export const suggestToneAdjustment = async ({
  templateBody: string,
  listingContext: string,
  brFormType: BrFormTypeCode,
}): Promise<{ suggestion: string; changes: string[] }> => {
  // Claude Sonnet에게 톤 제안 요청
  // 전체 재작성이 아닌 부분 수정 제안
}

// src/lib/ai/analyze.ts → 삭제 또는 비활성화
// AI 위반 분석 Decision 코드 제거
```

#### D9. Admin 템플릿 수정 플로우
```
현재: Draft → Admin 승인 → br_submitting
v2:   Draft → Admin이 템플릿에서 가져와서 수정 (subject/title/body/url) → Submit → br_submitting

UI 변경:
- Report Detail에서 "템플릿 선택" 버튼
- 선택 시 subject/body 자동 채워짐 (브라켓 변수 치환)
- Admin이 내용 수정
- Submit 시 br_submit_data 빌드 + 상태 변경
```

### Phase 3: Extension + 모니터링

#### D10. Extension PD 토글
```typescript
// extension/src/popup/components/Settings.ts (또는 기존 설정 UI)
// PD 신고 기능 ON/OFF 토글 추가
// chrome.storage.local에 저장: { pd_reporting_enabled: boolean }
// 기본값: true (기존 사용자 영향 최소화)

// extension/src/background/service-worker.ts
// PD 신고 함수 호출 전 토글 체크
if (!settings.pd_reporting_enabled) return
```

#### D11. Extension PD 기록 제거
```typescript
// extension/src/background/service-worker.ts
// PD 신고 후 웹 API 전송 코드 제거
// triggerFrontReport() 내부에서 Sentinel API 호출 부분 삭제
// 아마존 PD 페이지에서 신고만 하고 끝
```

#### D12. 모니터링 주기 변경
```typescript
// crawler/src/index.ts 또는 스케줄러 설정
// BR 모니터링: 30분 → app_settings.br_monitor_frequency 기반
// 'twice_daily' = 오전 10시, 오후 4시 (KST 기준)
// 리스팅 모니터링 (follow-up): 비활성화
```

#### D13. 클론 기준일 설정
```typescript
// Settings 페이지 > BR Settings 섹션에 추가
// "Clone threshold (days)" 입력 필드
// API: PATCH /api/settings { clone_threshold_days: number }
```

#### D14. 클론 기능
```
POST /api/reports/{id}/clone
- 기존 리포트 복사 → 새 draft 생성
- parent_report_id = 원본 ID
- 원본 상태 → archived (archive_reason: 'cloned')
- br_case_id 초기화 (새 케이스로 시작)

UI: Report Detail > "Clone as New Case" 버튼 (기존 구현 활용)
- 모니터링 탭에서 기준일 초과 리포트에 하이라이트 표시
```

---

## 4. UI Changes

### 4.1 Reports 목록
- 위반 유형 필터 → **BR 폼 타입 필터**로 교체
- 위반 뱃지 (V01 등) → **BR 폼 타입 뱃지**로 교체
- "New Report" 버튼 추가 (Admin 수동 작성)

### 4.2 Report Detail
- 위반 유형 섹션 → **BR 폼 타입 표시**로 교체
- AI 분석 결과 섹션 → 제거 또는 축소 (톤 제안만)
- "템플릿 선택" → body 자동 채움 → Admin 수정 플로우 강화

### 4.3 Settings
- **Clone threshold (days)** 입력 필드 추가
- **BR Monitor frequency** 선택 (twice_daily / custom)
- PD 관련 설정 제거

### 4.4 Extension Popup
- PD 토글 ON/OFF 설정 추가
- 카테고리 선택 UI → 6개 BR 폼 타입 기준 (변경 없음, 이미 일치)

---

## 5. 데이터 마이그레이션 전략

### 5.1 안전한 마이그레이션 순서

```
1. br_form_type 컬럼 추가 (nullable)
2. 마이그레이션 스크립트로 기존 데이터 변환
3. 코드에서 br_form_type 사용 시작 (읽기는 COALESCE)
4. 쓰기는 br_form_type만 사용
5. 3개월 후 레거시 컬럼 삭제
```

### 5.2 V코드 → BR 폼 타입 매핑 테이블

| V코드 | BR 폼 타입 | 비고 |
|------|-----------|------|
| V01, V02, V03 | ip_violation | RAV 경로 |
| V04 | other_policy | Counterfeit |
| V05~V09 | other_policy | Listing content |
| V10 | incorrect_variation | |
| V11, V12 | product_review | |
| V13~V15 | other_policy | Selling practice |
| V16~V19 | other_policy | Regulatory |
| variation | incorrect_variation | Extension v1.7.0 |
| main_image | other_policy | Extension v1.7.0 |
| wrong_category | other_policy | Extension v1.7.0 |
| pre_announcement | listing_issue | Extension v1.7.0 |
| review_violation | product_review | Extension v1.7.0 |
| intellectual_property | ip_violation | Extension v1.7.0 |

---

## 6. Implementation Order

```
Phase 1 (Foundation) — 추정 1~2일
  1. DB: br_form_type 컬럼 추가 + 마이그레이션 실행
  2. src/constants/br-form-types.ts 생성
  3. src/types/reports.ts에 br_form_type 추가
  4. src/constants/violations.ts 삭제 + 참조 전수 교체
  5. src/lib/reports/br-data.ts 리팩터 (매핑 제거, 직접 사용)
  6. UI 필터/뱃지 교체 (violation → br_form_type)
  7. PD 잔여 코드 최종 정리
  8. typecheck + lint + build 검증

Phase 2 (Core Flow) — 추정 2~3일
  9. Admin 수동 리포트 작성 API + UI
  10. AI 역할 축소 (analyze.ts 비활성, draft.ts → 톤 제안)
  11. Admin 템플릿 수정 플로우 변경
  12. typecheck + lint + build 검증

Phase 3 (Periphery) — 추정 1~2일
  13. Extension PD 토글 + 기록 제거
  14. 모니터링 주기 변경 (일 2회)
  15. 클론 기준일 설정 + 클론 기능
  16. Extension 빌드 + 릴리스
  17. 전체 E2E 검증
```

---

## 7. Rollback Plan

| 단계 | 롤백 방법 |
|------|----------|
| DB 마이그레이션 | 레거시 컬럼 유지 (3개월 후 삭제), br_form_type이 null이면 기존 로직 fallback |
| violations.ts 삭제 | git revert로 복원 가능 |
| Extension PD 토글 | 토글 기본값 ON이므로 기존 동작 유지 |
| 모니터링 주기 | 설정값 변경만으로 원복 가능 |

---

## 8. Files Summary

### 생성
| 파일 | 용도 |
|------|------|
| `src/constants/br-form-types.ts` | BR 폼 타입 상수 + 헬퍼 |
| `src/app/api/reports/manual/route.ts` | Admin 수동 리포트 작성 API |

### 삭제
| 파일 | 사유 |
|------|------|
| `src/constants/violations.ts` | V01~V19 전체 제거 |
| `src/lib/ai/analyze.ts` | AI 위반 분석 제거 (또는 비활성화) |

### 수정 (주요)
| 파일 | 변경 |
|------|------|
| `src/types/reports.ts` | violation 필드 → br_form_type |
| `src/lib/reports/br-data.ts` | BR_VIOLATION_MAP 제거, 직접 br_form_type 사용 |
| `src/lib/ai/draft.ts` | 전체 작성 → 톤 제안 |
| `src/app/(protected)/reports/ReportsContent.tsx` | 필터/뱃지 교체 |
| `src/app/(protected)/reports/[id]/ReportDetailContent.tsx` | 위반 섹션 → BR 폼 타입 |
| `src/app/api/reports/[id]/approve/route.ts` | violation 참조 → br_form_type |
| `extension/src/shared/br-report-config.ts` | BR_VIOLATION_MAP → 직접 매핑 |
| `extension/src/background/service-worker.ts` | PD 토글 + 기록 제거 |
| `crawler/src/index.ts` | 모니터링 주기 변경 |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | 2026-03-11 | Initial design — v2 워크플로우 전체 설계 |
