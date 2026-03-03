# Report Template Management Planning Document

> **Summary**: OMS 67개 신고 템플릿 마이그레이션 + 관리 UI 강화 + AI 프롬프트 연동
>
> **Project**: Sentinel (센티널)
> **Author**: Claude
> **Date**: 2026-03-03
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

기존 OMS 시스템의 67개 신고 템플릿을 Sentinel DB에 마이그레이션하고, 템플릿 관리 UI를 강화하며, AI 신고서 생성 시 템플릿을 프롬프트 컨텍스트로 활용할 수 있는 체계를 구축한다.

### 1.2 Background

- **현재 상태**: 템플릿 CRUD API, DB 스키마(`report_templates`), Settings UI(TemplatesTab), 리포트 적용 UI(TemplatePanel), 변수 치환 엔진(`interpolate.ts`) 모두 구현 완료
- **데모 데이터**: 3개 템플릿만 존재 (`tmpl-001` ~ `tmpl-003`)
- **OMS 원본**: 10개 위반 유형별 총 67개 템플릿 (Variation 18, Main Image 18, Review 7 등)
- **기획 결정 (D44)**: AI가 템플릿을 프롬프트 컨텍스트로 활용, Admin이 관리
- 템플릿 인프라는 완성되어 있으나, **실제 운영 데이터(67개 템플릿 콘텐츠)와 AI 연동이 빠져 있음**

### 1.3 Related Documents

- 기획: `Sentinel_Project_Context.md` (D44, OMS 위반 유형 매핑 테이블)
- 설계: `docs/archive/2026-03/sentinel/sentinel.design.md`
- DB: `supabase/migrations/005_report_templates.sql`
- 기존 코드: `src/app/api/templates/`, `src/app/(protected)/settings/TemplatesTab.tsx`, `src/app/(protected)/reports/[id]/TemplatePanel.tsx`

---

## 2. Scope

### 2.1 In Scope

- [ ] OMS 67개 템플릿 콘텐츠 시드 데이터 작성 (V01~V19 매핑)
- [ ] 마이그레이션 SQL로 시드 데이터 일괄 INSERT
- [ ] TemplatesTab UI 개선 — 카테고리별 그룹핑, 벌크 import/export
- [ ] 템플릿 사용량 추적 — `usage_count` 자동 증가 로직
- [ ] 새 Report 생성 시 템플릿 선택 단계 추가 (New Report flow)
- [ ] AI 프롬프트에 관련 템플릿 주입 — `/api/ai/analyze` 엔드포인트 연동
- [ ] Demo 데이터 확장 — 67개 전체 반영

### 2.2 Out of Scope

- AI 학습(Opus) 파이프라인 고도화 (별도 PDCA)
- 템플릿 버전 관리 / 히스토리 추적 (v2 기능)
- 다국어 템플릿 (현재 영어 기반, 추후 마켓플레이스별 확장)
- 템플릿 A/B 테스트 / 성공률 분석 (고급 기능)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | OMS 67개 템플릿 → Sentinel V01~V19 매핑 시드 데이터 작성 | High | Pending |
| FR-02 | 시드 데이터 마이그레이션 SQL 작성 (일괄 INSERT) | High | Pending |
| FR-03 | TemplatesTab — 카테고리별 그룹핑 뷰 | Medium | Pending |
| FR-04 | TemplatesTab — 템플릿 복제(Duplicate) 기능 동작 확인 | Low | Partial |
| FR-05 | 템플릿 적용 시 `usage_count` 자동 증가 API 호출 | Medium | Pending |
| FR-06 | New Report 생성 시 위반 유형 기반 템플릿 추천 UI | High | Pending |
| FR-07 | AI 분석 API에 관련 템플릿 컨텍스트 주입 | High | Pending |
| FR-08 | Demo 데이터에 67개 템플릿 전체 반영 | Medium | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement |
|----------|----------|-------------|
| Performance | Templates 목록 로드 < 500ms (67개 기준) | 브라우저 DevTools |
| UX | 카테고리 필터 1-click으로 관련 템플릿 노출 | Settings UI 테스트 |
| Data Quality | 67개 템플릿 모두 최소 1개 `violation_type` 매핑 | SQL 검증 |
| AI Integration | 관련 템플릿이 AI 프롬프트에 포함됨을 로그로 확인 | API 응답 검증 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] `report_templates` 테이블에 67개 이상 템플릿 존재 (시드 또는 수동 입력)
- [ ] Settings > Templates에서 카테고리별 필터링 동작
- [ ] Report 생성/편집 시 위반 유형에 맞는 템플릿 추천 표시
- [ ] 템플릿 적용 시 `usage_count` 증가 확인
- [ ] AI 분석 호출 시 관련 템플릿이 프롬프트에 포함됨
- [ ] `pnpm build` + `pnpm typecheck` 통과
- [ ] Demo 모드에서 67개 템플릿 확인 가능

### 4.2 Quality Criteria

- [ ] 모든 V01~V19 위반 유형에 최소 1개 이상 템플릿 매핑
- [ ] OMS 원본 10개 유형 ↔ Sentinel V01~V19 매핑 정확성 100%
- [ ] 변수 치환 (`{{ASIN}}` 등) 10개 모두 정상 동작
- [ ] Zero lint/type errors

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| OMS 실제 템플릿 텍스트를 확보할 수 없음 | High | Medium | Sentinel_Project_Context.md의 유형 설명 + Amazon 정책 기반으로 참조 템플릿 생성 |
| 67개 전체 시드 데이터 작성 볼륨이 큼 | Medium | High | 카테고리별 대표 템플릿 + 변형 패턴으로 효율적 생성 |
| AI 프롬프트 토큰 한도 초과 (다수 템플릿 주입 시) | Medium | Medium | 위반 유형별 최대 3개 관련 템플릿만 주입 |
| 기존 TemplatesTab UI 구조가 67개를 감당 못함 | Low | Medium | 페이지네이션 + 카테고리 그룹핑 추가 |

---

## 6. Architecture Considerations

### 6.1 Key Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| 시드 데이터 형태 | SQL INSERT / JSON import / Admin UI | SQL INSERT | 마이그레이션으로 일괄 관리, 버전 관리 가능 |
| AI 프롬프트 주입 방식 | 전체 주입 / 유형별 필터 / Top-N | 유형별 필터 (Top 3) | 토큰 효율 + 관련성 |
| New Report 템플릿 선택 | 필수 / 선택 / 자동 적용 | 선택 (권장 표시) | 사용자 자율성 유지 |

### 6.2 현재 구현 상태 (변경 최소화)

```
이미 완료:                         이번에 추가:
─────────────────────────         ─────────────────────────
✅ report_templates 스키마          → 67개 시드 데이터
✅ CRUD API (GET/POST/PATCH/DEL)   → usage_count 증가 API
✅ TemplatesTab (Settings)          → 카테고리 그룹핑
✅ TemplatePanel (Report Detail)    → New Report 연동
✅ interpolate.ts (변수 치환)       → AI 프롬프트 주입
✅ 3개 Demo 템플릿                  → 67개 전체 확장
```

---

## 7. OMS → Sentinel 템플릿 매핑 전략

### 7.1 1:1 매핑 (기존 OMS 유형 → Sentinel 코드)

| OMS 유형 | 템플릿 수 | Sentinel 코드 | 비고 |
|---------|----------|-------------|------|
| Variation | 18 | V10 | Size/Color Variation 포함 |
| Main Image | 18 | V08 | 이미지 정책 위반 |
| Review Violation | 7 | V11, V12 | 리뷰 조작 + 하이재킹 분리 |
| Counterfeit | 1 | V04 | 위조품 |
| Trademark | 3 | V01 | 상표권 |
| Copyright | 4 | V02 | 저작권 |
| Duplicate Listing | 6 | V15 | 리스팅 하이재킹 |
| Wrong Category | 2 | V17 | 제한 상품 |
| Pre-announcement | 3 | V07 | 부정확한 상품 정보 |
| Other Concerns | 5 | V05, V06, V07 | 세분화 분배 |

### 7.2 신규 유형 (OMS에 없음 → 새로 작성)

| Sentinel 코드 | 유형 | 필요 템플릿 | 비고 |
|-------------|------|-----------|------|
| V03 | 특허 침해 | 3~5 | Monday.com 기반 신규 |
| V09 | 타이틀 정책 위반 | 2~3 | Amazon 정책 기반 |
| V13 | 경쟁사 리뷰 악용 | 1~2 | 신규 |
| V14 | 비인가 판매자 | 2~3 | 신규 |
| V16 | 가격 조작 | 1~2 | 신규 |
| V18 | 안전 인증 미비 | 2~3 | 신규 |
| V19 | 유통기한 위반 | 1~2 | 신규 |

**예상 총 템플릿 수**: 67 (OMS) + 15~20 (신규) ≈ **80~87개**

---

## 8. Implementation Strategy

### Phase A: 시드 데이터 작성 + Demo 확장

1. **OMS 67개 템플릿 시드 SQL 작성** — `supabase/migrations/006_seed_templates.sql`
2. **신규 유형(V03, V09, V13~V19) 템플릿 추가** — 동일 SQL
3. **Demo 데이터 확장** — `src/lib/demo/data.ts`의 `DEMO_TEMPLATES` 67→80+개
4. **OMS→Sentinel 매핑 검증** — 모든 V01~V19에 최소 1개 매핑 확인

### Phase B: UI 개선 + 사용량 추적

1. **TemplatesTab 카테고리 그룹핑** — violation category별 접이식 섹션
2. **usage_count 증가 로직** — TemplatePanel "Apply" 시 PATCH API 호출
3. **New Report 생성 시 템플릿 선택** — 위반 유형 선택 후 추천 템플릿 표시

### Phase C: AI 연동

1. **`/api/ai/analyze`에 템플릿 컨텍스트 주입** — 위반 유형 기반 Top 3 템플릿 조회 후 프롬프트에 포함
2. **프롬프트 구조화** — "참조 템플릿" 섹션으로 AI에게 전달
3. **AI 생성 신고서에 활용된 템플릿 ID 기록** (선택)

---

## 9. Key Dependencies

### 9.1 사용자 입력 필요 항목

| 항목 | 설명 | 상태 |
|------|------|------|
| **OMS 실제 템플릿 텍스트** | 67개 원문 | **확보 불가** — AI 기반 생성으로 대체 |
| **Spigen 내부 정책 문구** | Amazon Policy 인용 스타일 | 공개 정책 기반 대체 |

> **결정**: OMS 템플릿 원문을 확보할 수 없으므로, Amazon Seller Central 공개 정책 문서 + Sentinel_Project_Context.md의 위반 유형 설명 + 금지 키워드 목록을 기반으로 AI가 80+ 참조 템플릿을 생성합니다. 운영 시작 후 Admin이 실제 성공 사례 기반으로 템플릿을 수정/보완하는 방식으로 진화시킵니다.

---

## 10. Estimated Effort

| Phase | 작업 | Claude 가능 | 사용자 필요 |
|-------|------|:-----------:|:-----------:|
| A | 시드 데이터 + Demo 확장 | ☑ | ☐ (원문 있으면 제공) |
| B | UI 개선 + 사용량 추적 | ☑ | ☐ |
| C | AI 프롬프트 연동 | ☑ | ☐ |

---

## 11. Next Steps

1. [ ] 이 Plan 승인 + OMS 템플릿 원문 확보 여부 확인
2. [ ] `/pdca design report-template-management` 설계 문서 작성
3. [ ] Phase A 시드 데이터 작성 (가장 볼륨 큰 작업)
4. [ ] Phase B+C 구현

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-03 | Initial draft | Claude |
