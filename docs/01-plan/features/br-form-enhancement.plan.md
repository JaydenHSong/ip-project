# BR Form Enhancement — Plan

> **Feature**: BR 템플릿 관리 UI + BR 폼 추가 필드 (신고 데이터 동기화)
> **Created**: 2026-03-10
> **Phase**: Plan
> **Priority**: High

---

## 1. Background

### 문제 1: 템플릿 관리 기능 부족
- `BrTemplateSettings.tsx`에 Import/Delete만 있음
- Admin이 개별 템플릿을 **수정하거나 새로 생성**할 수 없음
- 템플릿 body 미리보기도 없어 어떤 내용인지 한눈에 안 보임
- 카테고리/폼타입별 필터링 없음

### 문제 2: BR 폼 추가 필드 미지원
- BR 신고 시 description 외에도 필드가 있음:
  - `seller_storefront_url` — 판매자 스토어프런트 URL
  - `policy_url` — 위반 정책 링크
  - `order_id` — 테스트 구매 주문번호
- `BrSubmitData` 타입에 이미 정의되어 있지만 입력 UI 없음
- 현재 `buildBrSubmitData`에서 listing의 `seller_storefront_url`만 자동 주입
- Admin이 리포트 디테일에서 직접 입력하면 크롤러가 BR 폼에 자동 fill 가능

## 2. Goals

| # | Goal | Description |
|---|------|-------------|
| G1 | 템플릿 CRUD | Settings에서 Admin이 템플릿 조회/생성/수정/삭제 가능 |
| G2 | 템플릿 미리보기 | 테이블에서 body 미리보기, 모달에서 전문 확인 |
| G3 | BR 추가 필드 입력 | 리포트 디테일에서 seller URL, policy URL, order ID 편집 |
| G4 | 필드 → br_submit_data 동기화 | 입력한 값이 승인 시 br_submit_data에 포함되어 크롤러가 사용 |

## 3. Scope

### 3.1 In Scope

| # | Item | Detail |
|---|------|--------|
| S1 | 템플릿 생성 모달 | Settings > BR Templates에 "New Template" 버튼 + 폼 모달 (code, category, title, body, br_form_type, violation_codes) |
| S2 | 템플릿 수정 모달 | 테이블 행 클릭 → 수정 모달 (body 포함 전체 필드 편집) |
| S3 | 템플릿 body 프리뷰 | 테이블에 body 첫 2줄 미리보기 + 확장 가능 |
| S4 | 템플릿 필터 | category, br_form_type, active 상태별 필터 |
| S5 | BR 추가 필드 UI | 리포트 디테일 Draft 섹션에 collapsible "Additional Fields" 영역 |
| S6 | 필드 → br_submit_data | approve 시 추가 필드를 br_submit_data에 병합 |
| S7 | API 확장 | `PATCH /api/br-templates/:id` (수정), approve에 추가 필드 전달 |

### 3.2 Out of Scope

- 크롤러 br-submit 폼 필드 fill 로직 변경 (이미 BrSubmitData 필드 기반으로 동작)
- 대량 편집 (bulk edit)
- 템플릿 버전 관리 (history)

## 4. Current State Analysis

### 4.1 Settings 템플릿 현황

`BrTemplateSettings.tsx` 기능:
- [x] 전체 목록 조회 (테이블)
- [x] Excel/CSV Import
- [x] 개별 삭제
- [ ] 신규 생성
- [ ] 수정
- [ ] body 미리보기
- [ ] 필터

### 4.2 API 현황

| Endpoint | Method | 현재 상태 |
|----------|--------|----------|
| `/api/br-templates` | GET | 조회 (form_type, category 필터 지원) |
| `/api/br-templates` | POST | 생성 (있음, 미사용) |
| `/api/br-templates/:id` | PATCH | 없음 — 수정 API 필요 |
| `/api/br-templates/:id` | DELETE | 삭제 (있음) |

### 4.3 BrSubmitData 필드 매핑

| BrSubmitData 필드 | BR 폼 위치 | 현재 입력 방식 | 목표 |
|-------------------|-----------|---------------|------|
| `description` | 메인 텍스트 | draft_body에서 복사 | 유지 |
| `product_urls` | 상품 URL | listing.url 자동 | 유지 |
| `seller_storefront_url` | 판매자 스토어 | listing에서 자동 (있으면) | + 수동 입력 |
| `policy_url` | 정책 링크 | 없음 | 수동 입력 |
| `order_id` | 주문번호 | 없음 | 수동 입력 |
| `asins` | ASIN 목록 | listing.asin 자동 | 유지 |

### 4.4 영향받는 파일

| File | 변경 내용 |
|------|----------|
| `src/app/(protected)/settings/BrTemplateSettings.tsx` | 생성/수정 모달, body 프리뷰, 필터 추가 |
| `src/app/api/br-templates/[id]/route.ts` | PATCH 핸들러 추가 (수정) |
| `src/app/(protected)/reports/[id]/ReportDetailContent.tsx` | 추가 필드 UI |
| `src/app/api/reports/[id]/approve/route.ts` | 추가 필드 → br_submit_data 병합 |
| `src/lib/reports/br-data.ts` | buildBrSubmitData 확장 |

## 5. UI Sketches

### S1-S2: 템플릿 생성/수정 모달
```
┌─────────────────────────────────────┐
│ New Template / Edit Template        │
├─────────────────────────────────────┤
│ Code:     [MI-14          ]         │
│ Category: [Main image     ▼]       │
│ Title:    [Image overlay text  ]    │
│ Form Type:[Other policy   ▼]       │
│ Violations: [V04, V05     ]        │
│                                     │
│ Body:                               │
│ ┌─────────────────────────────────┐ │
│ │ The listing for [ASIN] has an   │ │
│ │ image that contains...          │ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Cancel]              [Save]        │
└─────────────────────────────────────┘
```

### S5: 리포트 디테일 추가 필드
```
┌─────────────────────────────────────┐
│ ▾ Additional BR Fields              │
├─────────────────────────────────────┤
│ Seller Storefront URL:              │
│ [https://amazon.com/stores/...  ]   │
│                                     │
│ Policy URL:                         │
│ [https://sellercentral.amazon...]   │
│                                     │
│ Order ID:                           │
│ [111-1234567-1234567           ]    │
└─────────────────────────────────────┘
```
폼 타입에 따라 관련 필드만 표시:
- `other_policy`: seller_storefront_url, policy_url
- `incorrect_variation`: (없음)
- `product_review`: order_id

## 6. Implementation Order

```
1. API: PATCH /api/br-templates/:id 추가
2. UI: BrTemplateSettings — 생성/수정 모달 + body 프리뷰 + 필터
3. UI: ReportDetailContent — 추가 필드 collapsible 섹션
4. API: approve에 추가 필드 전달 → br_submit_data 병합
5. Build + Test
```

## 7. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------:|
| 템플릿 body 길어서 모달 스크롤 | Low | textarea auto-resize + max-height |
| order_id 포맷 검증 | Low | 자유 입력 허용, 크롤러에서 fill만 |
| 기존 br_submit_data에 필드 추가 | Low | optional 필드라 하위호환 유지 |

## 8. Success Criteria

- [ ] Settings에서 템플릿 생성/수정/삭제 가능 (Admin+)
- [ ] 템플릿 body 미리보기 + 전문 보기
- [ ] 리포트 디테일에서 추가 필드 입력 가능
- [ ] 승인 시 추가 필드가 br_submit_data에 포함
- [ ] `pnpm build` 통과

---

**Next Phase**: `/pdca design br-form-enhancement`
