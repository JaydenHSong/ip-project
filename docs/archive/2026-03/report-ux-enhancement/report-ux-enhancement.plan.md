# Report UX Enhancement Planning Document

> **Summary**: 브레인스토밍 7개 항목 — Report 워크플로우 개선, 템플릿 관리, Listing 정보 확장, 스크린샷 프리뷰
>
> **Project**: Sentinel (센티널)
> **Version**: 0.1.0
> **Author**: Claude + Hoon
> **Date**: 2026-03-03
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

Report Detail 페이지의 UX를 개선하고, 신고서 작성 효율을 높이는 기능들을 추가한다.
현재 Report 워크플로우에서 불필요한 단계를 제거하고, 템플릿 시스템을 도입하며,
Listing 정보를 풍부하게 표시하여 오퍼레이터의 판단 속도를 높인다.

### 1.2 Background

현재 Sentinel Report 시스템의 개선점:
- **Cancel 버튼 혼란**: Report Detail에 Cancel 버튼이 있으나 실제로는 Archive가 적절
- **Approve/Submit 이중 클릭**: 승인 후 별도로 SC 제출해야 하는 불필요한 단계
- **템플릿 부재**: 67개 OMS 템플릿이 아직 마이그레이션되지 않음. AI 파이프라인에 `template` 파라미터 슬롯은 있으나 UI/DB 없음
- **Listing 정보 부족**: rating, review_count 등 DB에 있는 데이터가 UI에 표시되지 않음
- **스크린샷 기능 없음**: ASIN 페이지 캡처 및 증거 관리 기능 부재

### 1.3 Related Documents

- 원본: `docs/01-plan/brain storming .rtf`
- 설계 문서 (전체): `docs/archive/2026-03/sentinel/sentinel.design.md`
- Report 타입: `src/types/reports.ts`, `src/types/listings.ts`

---

## 2. Scope

### 2.1 In Scope

- [x] BS-01: Cancel → Archive 버튼 전환 + 이동
- [x] BS-02: Approve + Submit 통합 (원클릭 승인제출)
- [x] BS-03: 신고서 템플릿 선택/적용 UI
- [x] BS-04: 템플릿 카테고리 관리
- [x] BS-05: Listing에 리뷰 수/평점 표시
- [x] BS-06: ASIN 페이지 스크린샷 캡처 버튼
- [x] BS-07: 스크린샷 호버 프리뷰 + 버전 관리

### 2.2 Out of Scope

- 67개 OMS 템플릿 실제 데이터 마이그레이션 (별도 작업)
- Crawler 측 스크린샷 자동 캡처 (이미 구현됨)
- Supabase 실 연동 (별도 PDCA 진행 중)
- SC 자동화 Playwright 엔진 (별도 패키지)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status | BS# |
|----|-------------|----------|--------|-----|
| FR-01 | Report Detail에서 Cancel 버튼을 Archive 버튼으로 교체. 클릭 시 archive API 호출 후 `/reports/archived`로 이동 | High | Pending | 1 |
| FR-02 | Archive 시 사유 입력 모달 표시 (기존 archive_reason 필드 활용) | High | Pending | 1 |
| FR-03 | `approved` 상태에서 "Submit to SC" 버튼 제거, "Approve & Submit" 원클릭 버튼으로 통합 | High | Pending | 2 |
| FR-04 | Approve & Submit 클릭 시: (1) 상태를 approved로 변경 → (2) 자동으로 SC 제출 API 호출 → (3) 상태를 submitted로 변경 | High | Pending | 2 |
| FR-05 | `pending_review` 상태 액션에 "Approve & Submit" 추가, 기존 "Approve"는 "Approve Only"로 변경 | Medium | Pending | 2 |
| FR-06 | Report Detail에 "템플릿 적용" 버튼 추가. SlidePanel로 템플릿 목록 표시 | High | Pending | 3 |
| FR-07 | 템플릿 선택 시 draft_body에 내용 삽입. 함수 변수 자동 치환 (`{{ASIN}}`, `{{TITLE}}`, `{{SELLER}}` 등) | High | Pending | 3 |
| FR-08 | 템플릿 CRUD: 생성/수정/삭제/복제. 관리 페이지 또는 Settings 내 탭 | Medium | Pending | 3,4 |
| FR-09 | 템플릿 카테고리 분류: 위반 유형별 (V01~V19), 마켓플레이스별, 커스텀 태그 | Medium | Pending | 4 |
| FR-10 | 템플릿 목록에서 카테고리 필터 + 검색 | Medium | Pending | 4 |
| FR-11 | Report Detail Listing 카드에 rating (별점) + review_count (리뷰 수) 표시 | High | Pending | 5 |
| FR-12 | Report Detail Listing 카드에 price 표시 | Low | Pending | 5 |
| FR-13 | Report Detail에 "ASIN 스크린샷 캡처" 버튼 추가. 클릭 시 해당 ASIN Amazon 페이지를 캡처 | Medium | Pending | 6 |
| FR-14 | 캡처된 스크린샷을 Report의 evidence에 첨부 (draft_evidence[] 배열) | Medium | Pending | 6 |
| FR-15 | Listing 이미지/스크린샷 링크 hover 시 팝업 프리뷰 표시 | Medium | Pending | 7 |
| FR-16 | 스크린샷 여러 개일 때 버전별 정리 (날짜 + 캡처 시점 라벨) | Low | Pending | 7 |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 템플릿 목록 로딩 < 500ms | Playwright E2E |
| UX | Archive/Submit 워크플로우 클릭 수 50% 감소 | 기존 3클릭 → 1클릭 |
| Accessibility | 모든 새 버튼에 aria-label 제공 | E2E 테스트 |

---

## 4. Implementation Groups

기능을 3개 그룹으로 나누어 순차 구현:

### Group A: 워크플로우 개선 (FR-01 ~ FR-05)
**우선순위: 높음 | 복잡도: 낮음 | 예상 파일: 3~4개**

기존 코드 수정 위주. 새 컴포넌트 불필요.

| 수정 파일 | 변경 내용 |
|-----------|----------|
| `src/app/(protected)/reports/[id]/ReportActions.tsx` | Cancel → Archive 버튼 교체, Approve & Submit 통합 버튼 추가 |
| `src/app/api/reports/[id]/archive/route.ts` | Archive API (기존 있으면 확인, 없으면 생성) |
| `src/app/api/reports/[id]/approve-submit/route.ts` | 새 API: approve + submit 원자적 실행 |
| `src/lib/i18n/locales/en.ts`, `ko.ts` | 새 버튼 라벨 번역 |

### Group B: 템플릿 시스템 (FR-06 ~ FR-10)
**우선순위: 높음 | 복잡도: 중간 | 예상 파일: 8~10개**

새 데이터 모델 + UI + API 필요.

| 파일 | 작업 |
|------|------|
| `src/types/templates.ts` | 새 타입: Template, TemplateCategory |
| `src/lib/demo/data.ts` | 데모 템플릿 데이터 추가 |
| `src/app/api/templates/route.ts` | 템플릿 CRUD API |
| `src/app/(protected)/reports/[id]/TemplatePanel.tsx` | 새 컴포넌트: 템플릿 선택 SlidePanel |
| `src/app/(protected)/reports/[id]/ReportDetailContent.tsx` | 템플릿 적용 버튼 연동 |
| `src/app/(protected)/settings/TemplateManager.tsx` | 템플릿 관리 UI (CRUD) |
| `src/lib/templates/interpolate.ts` | 변수 치환 엔진 (`{{ASIN}}` → 실제값) |
| `supabase/migrations/005_templates.sql` | 템플릿 테이블 DDL |

**템플릿 변수 시스템:**
```
{{ASIN}}          → listing.asin
{{TITLE}}         → listing.title
{{SELLER}}        → listing.seller_name
{{MARKETPLACE}}   → listing.marketplace (US/JP/DE 등)
{{BRAND}}         → listing.brand
{{PRICE}}         → listing.price_amount + price_currency
{{VIOLATION_TYPE}} → confirmed_violation_type 라벨
{{TODAY}}         → 현재 날짜 (YYYY-MM-DD)
```

### Group C: Listing 정보 확장 + 스크린샷 (FR-11 ~ FR-16)
**우선순위: 중간 | 복잡도: 중간 | 예상 파일: 5~7개**

| 파일 | 작업 |
|------|------|
| `src/app/(protected)/reports/[id]/ReportDetailContent.tsx` | Listing 카드에 rating/review/price 추가 |
| `src/app/(protected)/reports/[id]/page.tsx` | Supabase select에 rating, review_count, price 추가 |
| `src/app/(protected)/reports/[id]/ScreenshotCapture.tsx` | 새 컴포넌트: 스크린샷 캡처 버튼 |
| `src/app/api/reports/[id]/screenshot/route.ts` | 스크린샷 캡처 API (서버에서 Playwright headless로 캡처) |
| `src/components/ui/ImageHoverPreview.tsx` | 새 컴포넌트: 호버 시 이미지 프리뷰 팝업 |
| `src/components/ui/ScreenshotVersionList.tsx` | 새 컴포넌트: 스크린샷 버전 목록 |
| `src/app/(protected)/reports/ReportsContent.tsx` | Quick View에도 rating/review 표시 |

---

## 5. Success Criteria

### 5.1 Definition of Done

- [ ] Group A: Archive 버튼으로 전환, Approve & Submit 원클릭 동작
- [ ] Group B: 데모 템플릿 3개 이상, 선택/적용/변수치환 동작
- [ ] Group C: rating/review 표시, 스크린샷 캡처 버튼 동작 (DEMO_MODE에서 목업)
- [ ] 기존 E2E 테스트 94개 깨지지 않음
- [ ] 새 기능에 대한 E2E 테스트 추가
- [ ] 한국어/영어 번역 완료

### 5.2 Quality Criteria

- [ ] `pnpm typecheck` 통과
- [ ] `pnpm lint` 통과
- [ ] `pnpm build` 성공
- [ ] E2E 전체 통과

---

## 6. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Approve+Submit 실패 시 중간 상태 | High | Medium | 트랜잭션으로 처리, 실패 시 rollback. 에러 토스트 표시 |
| 템플릿 변수 치환 오류 | Medium | Low | 미치환 변수는 `{{VAR}}` 그대로 표시 + 경고 |
| 스크린샷 캡처 서버 부하 | Medium | Medium | DEMO_MODE에서는 목업 이미지 반환. rate limit 적용 |
| 기존 E2E 테스트 깨짐 | High | Medium | 버튼 텍스트/셀렉터 변경 시 E2E도 함께 수정 |

---

## 7. Architecture Considerations

### 7.1 Project Level

| Level | Selected |
|-------|:--------:|
| **Dynamic** | ✅ |

### 7.2 Key Decisions

| Decision | Selected | Rationale |
|----------|----------|-----------|
| 템플릿 저장소 | Supabase `report_templates` 테이블 (DEMO_MODE에서는 인메모리) | 기존 패턴과 일치 |
| 변수 치환 | 클라이언트 사이드 (브라우저에서 즉시 프리뷰) | 서버 왕복 불필요, 실시간 프리뷰 가능 |
| 스크린샷 캡처 | API Route → headless 브라우저 (DEMO_MODE에서는 목업 URL) | Crawler 없이 웹에서 독립 실행 |
| 이미지 프리뷰 | CSS hover 팝업 (JS 없이) + `<img>` lazy loading | 가볍고 빠름 |

### 7.3 데이터 모델 (신규)

```sql
-- report_templates 테이블
CREATE TABLE report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,              -- {{ASIN}}, {{TITLE}} 등 변수 포함
  category TEXT,                   -- 위반 유형 카테고리 (V01~V19)
  marketplace TEXT[],              -- 적용 마켓플레이스 (US, JP, DE 등)
  tags TEXT[],                     -- 커스텀 태그
  is_default BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 8. Convention Prerequisites

### 8.1 Existing Conventions (확인됨)

- [x] `CLAUDE.md` 코딩 컨벤션 (TypeScript, React, Naming)
- [x] ESLint + Prettier 설정
- [x] TypeScript strict mode
- [x] `type` 사용 (`interface` 지양), `enum` 금지
- [x] Server Components 기본, `"use client"` 필요시만

### 8.2 Environment Variables

| Variable | Purpose | Scope | Exists |
|----------|---------|-------|:------:|
| `DEMO_MODE` | 데모 데이터 사용 | Server | ✅ |
| `SUPABASE_URL` | Supabase 연결 | Server | ✅ |

신규 환경변수 불필요 (기존 인프라 활용).

---

## 9. Implementation Order

```
Group A (워크플로우) ──→ Group B (템플릿) ──→ Group C (Listing+스크린샷)
      1~2일                  2~3일                   2~3일
```

1. **Group A 먼저**: 기존 코드 수정만으로 즉시 UX 개선 가능
2. **Group B**: 새 데이터 모델 + UI 필요하지만, AI 파이프라인 `template` 슬롯 활용
3. **Group C**: Listing 확장은 간단하나 스크린샷은 서버 인프라 필요

---

## 10. Next Steps

1. [ ] Design 문서 작성 (`/pdca design report-ux-enhancement`)
2. [ ] 팀 리뷰 및 승인
3. [ ] Group A부터 구현 시작

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-03 | Initial draft — brainstorming 7개 항목 통합 | Claude + Hoon |
