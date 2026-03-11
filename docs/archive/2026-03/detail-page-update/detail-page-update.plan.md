# Detail Page Update — Plan

> **Feature**: Report Detail + Draft 페이지 BR 카테고리 싱크 + 템플릿 전환
> **Created**: 2026-03-10
> **Phase**: Plan
> **Priority**: High

---

## 1. Background

현재 Report Detail/Draft 페이지의 문제:
1. **BR form type 선택 없음** — 위반 코드(V01~V19)로 자동 매핑만 됨, 사용자가 직접 선택/변경 불가
2. **레거시 템플릿 사용 중** — `InlineTemplateList`가 `/api/templates` (구 `report_templates`)를 호출, 새 `br_templates` (38개)를 사용하지 않음
3. **폼 타입별 필드 가이드 없음** — 4개 BR 카테고리마다 필요한 정보가 다른데 드래프트 작성 시 안내 없음

## 2. Goals

| # | Goal | Description |
|---|------|-------------|
| G1 | BR Form Type 드롭다운 | Draft 편집 시 BR 카테고리 선택 (other_policy, incorrect_variation, product_review, product_not_as_described) |
| G2 | 새 BR 템플릿 연동 | `br_templates` 테이블 사용, form type별 필터링 |
| G3 | 폼 타입별 필드 가이드 | 선택한 카테고리에 맞는 필드 안내 표시 (어떤 정보가 필요한지) |
| G4 | 레거시 템플릿 숨기기 | 구 `report_templates` 참조 제거 (또는 fallback으로 유지) |

## 3. Scope

### 3.1 In Scope

| # | Item | Detail |
|---|------|--------|
| S1 | BR Form Type 드롭다운 | ReportDetailContent 드래프트 섹션에 추가. 기본값: `BR_VIOLATION_MAP[violation_code]`에서 자동 선택, 사용자 오버라이드 가능 |
| S2 | InlineTemplateList → BrTemplateList | 새 컴포넌트로 교체. `/api/br-templates?form_type=X` 호출, category별 그룹핑 |
| S3 | 폼 타입 설명 배너 | 드롭다운 아래 info 배너 — 해당 폼에서 어떤 description을 써야 하는지 가이드 |
| S4 | AI Draft에 form type 전달 | `handleAiWrite`에서 선택된 form type을 `/api/ai/draft`에 전달, AI가 해당 카테고리에 맞춘 드래프트 생성 |
| S5 | br_submit_data에 form type 저장 | 승인 시 사용자가 선택한 form type이 `br_submit_data.form_type`에 반영 |
| S6 | Template auto-suggestion 업데이트 | 빈 draft일 때 auto-suggest도 `br_templates`에서 가져오기 |
| S7 | 레거시 `/api/templates` 참조 정리 | `InlineTemplateList`, auto-suggestion fetch를 `br_templates`로 교체 |

### 3.2 Out of Scope

- `report_templates` 테이블 삭제 (아직 다른 곳에서 참조 가능)
- BR form-config.ts (크롤러) 변경 — 이미 완성됨
- Settings > Templates 페이지 변경 — 이미 BR 전용으로 전환 완료

## 4. Current State Analysis

### 4.1 데이터 흐름

```
현재:
  Report Draft → /api/templates (레거시 report_templates)
  Report Draft → AI Write → violation_code → BR_VIOLATION_MAP → form_type (자동)
  Approve → buildBrSubmitData() → br_submit_data.form_type (자동, 변경 불가)

목표:
  Report Draft → BR Form Type 드롭다운 (기본: 자동매핑, 수동 변경 가능)
  Report Draft → /api/br-templates?form_type=X (새 br_templates)
  Report Draft → AI Write → 선택된 form_type 전달
  Approve → br_submit_data.form_type = 사용자 선택값
```

### 4.2 영향받는 파일

| File | 변경 내용 |
|------|----------|
| `src/app/(protected)/reports/[id]/ReportDetailContent.tsx` | form type 드롭다운 추가, AI Write에 form type 전달, 승인 시 form type 포함 |
| `src/app/(protected)/reports/[id]/InlineTemplateList.tsx` | → 삭제 또는 `BrTemplateList.tsx`로 교체 |
| `src/app/api/br-templates/route.ts` | `?form_type=X` 쿼리 파라미터 필터링 추가 |
| `src/app/api/ai/draft/route.ts` | `br_form_type` 파라미터 수신, 기존 자동매핑 오버라이드 |
| `src/lib/ai/prompts/draft.ts` | form type 파라미터 전달 |
| `src/app/api/reports/[id]/approve/route.ts` | `br_form_type` 수신 → `buildBrSubmitData`에 전달 |
| `src/lib/reports/br-data.ts` | `buildBrSubmitData`에 form type 오버라이드 옵션 추가 |

### 4.3 BR Form Type 정보

| Form Type | 메뉴명 | 필수 필드 | 선택 필드 |
|-----------|--------|----------|----------|
| `other_policy` | Other policy violations | description, urls | storefront_url, policy_url |
| `incorrect_variation` | Incorrect variation | description, urls | — |
| `product_not_as_described` | Product not as described | description, urls | storefront_url, order_id |
| `product_review` | Product review violation | description, asins, urls | order_id |

### 4.4 br_templates 현황

| Category | Count | Form Type |
|----------|:-----:|-----------|
| Pre-announcement Listing | 3 | other_policy |
| Variation | 15 | other_policy (대부분) |
| Main image | 13 | other_policy |
| Wrong Category | 2 | other_policy |
| Product review | 5 | product_review |

**참고**: 현재 38개 중 36개가 `other_policy`, 1개 `product_review`, 1개 `incorrect_variation`. 추후 form_type 분류 정교화 필요할 수 있음.

## 5. Implementation Order

```
1. API: /api/br-templates에 form_type 필터 추가
2. UI: BrTemplateList 컴포넌트 생성 (br_templates 기반)
3. UI: ReportDetailContent에 BR Form Type 드롭다운 추가
4. API: /api/ai/draft에 br_form_type 파라미터 지원
5. API: /api/reports/[id]/approve에 br_form_type 전달
6. Cleanup: 레거시 InlineTemplateList 참조 제거
7. Verify: 빌드 + 기능 테스트
```

## 6. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| form_type 변경 시 템플릿 0건 | Medium | "이 카테고리에 맞는 템플릿이 없습니다" 안내 + 전체 보기 옵션 |
| 기존 draft에 form_type 없음 | Low | 기본값: `BR_VIOLATION_MAP[violation_code]` fallback |
| AI 드래프트가 form type 무시 | Low | 프롬프트에 form type context 이미 주입됨 (getBrFormContext) |

## 7. Success Criteria

- [ ] Draft 편집 시 BR Form Type 드롭다운 표시 + 기본값 자동 선택
- [ ] 드롭다운 변경 시 템플릿 목록이 해당 form type으로 필터링
- [ ] AI Write가 선택된 form type에 맞는 드래프트 생성
- [ ] 승인 시 `br_submit_data.form_type`에 사용자 선택값 반영
- [ ] 레거시 `/api/templates` 호출 0건 (Detail 페이지 한정)
- [ ] `pnpm build` 통과

---

**Next Phase**: `/pdca design detail-page-update`
