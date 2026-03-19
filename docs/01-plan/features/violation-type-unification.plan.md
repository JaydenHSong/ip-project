# Violation Type Unification Planning Document

> **Summary**: Extension 9개 위반 유형을 Single Source of Truth로, 크롤러/Web 전체 싱크
>
> **Project**: Sentinel
> **Version**: 0.9.0-beta
> **Author**: CTO Lead + PM 논의 (2026-03-18)
> **Date**: 2026-03-18
> **Status**: Draft — 2026-03-19 Plan 확정 예정

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 3개 위반 유형 체계(V01~V19 레거시, BR Form Types 4개, Crawler AI 7개)가 독립 존재. Extension↔Web↔Crawler 간 매핑 불일치 (예: V04가 Extension=other_policy, Web=ip_violation) |
| **Solution** | Extension의 9개 위반 유형을 L1 기준으로 통합. 크롤러 AI 탐지 5개 + 수동 전용 4개. V01~V19는 soft deprecate |
| **Function/UX Effect** | 탐지→분류→신고서→BR 제출 전체 파이프라인에서 위반 유형 일관성 확보 |
| **Core Value** | 단일 위반 체계로 유지보수 비용 감소 + 신고 정확도 향상 |

---

## 1. 확정된 L1 위반 유형 (9개)

Extension 드롭다운 기준 — 실제 신고 데이터에서 검증됨.

| # | 코드 | 라벨 | BR 신고 경로 | 크롤러 AI 탐지 | 비고 |
|---|------|------|-------------|:--------------:|------|
| 1 | ip_trademark | IP V01 — Trademark | RAV | ✅ | 키워드 기반 |
| 2 | ip_copyright | IP V02 — Copyright | RAV | ❌ | 수동 판단 필요 |
| 3 | ip_patent | IP V03 — Design Patent | RAV | ❌ | 수동 판단 필요 |
| 4 | ip_counterfeit | IP V04 — Counterfeit | RAV | ✅ | AI 비전 분석 |
| 5 | incorrect_variation | Variation | BR Contact Support | ✅ | 베리에이션 수 + AI |
| 6 | main_image | Main Image | BR Contact Support | ✅ | 이미지 정책 AI |
| 7 | wrong_category | Wrong Category | BR Contact Support | ❌ | 수동 판단 필요 |
| 8 | pre_announcement | Pre-announcement | BR Contact Support | ❌ | 수동 판단 필요 |
| 9 | review_violation | Review Violation | BR Contact Support | ✅ | 리뷰 패턴 AI |

### 탐지 방식 구분

| 방식 | 유형 | 설명 |
|------|------|------|
| **크롤러 AI 자동** (5개) | trademark, counterfeit, variation, main_image, review | 캠페인 크롤링 시 AI가 판별 |
| **수동 Extension** (4개) | copyright, patent, wrong_category, pre_announcement | 사람이 판단해야 하는 영역 |

---

## 2. 실제 신고 데이터 (2026-03 기준)

| Subject | 건수 | 현재 BR Form |
|---------|:----:|-------------|
| Product incorrectly added as a variation... | 40 | incorrect_variation |
| Main image violation | 27 | other_policy → **main_image** |
| Wrong Category | 15 | other_policy → **wrong_category** |
| Product review violation | 7 | product_review → **review_violation** |

---

## 3. 현재 불일치 사항

| 위치 | 문제 |
|------|------|
| `violations.ts` (V01~V19) | 아무 파일도 import 안 함 — 죽은 코드 |
| `br-form-types.ts` | 4개 BR 폼만 정의, main_image/wrong_category가 other_policy에 묶임 |
| `crawler/ai/prompts.ts` | V01,V04,V08,V10,V11,V14,V15 (7개) 하드코딩 |
| Extension `br-report-config.ts` | V04→other_policy 매핑 (Web은 ip_violation) — **불일치** |
| Extension `constants.ts` | V01~V15 + 6개 카테고리 — 자체 매핑 체계 |

---

## 4. 통합 방향 (내일 Plan 확정 시 구체화)

### 4.1 Single Source of Truth
- `src/constants/violation-types.ts` 신규 파일 — 9개 L1 정의
- 기존 `violations.ts` → re-export wrapper (하위 호환)
- 기존 `br-form-types.ts` → L1 기반으로 리팩토링

### 4.2 매핑 통합
- L1 → BR Form Type 매핑 (ip_* → RAV, 나머지 → BR Contact Support)
- L1 → Subject 매핑 (BR 제출 시 사용)
- L1 → 크롤러 AI 프롬프트 매핑

### 4.3 영향 범위 (예상)
| 컴포넌트 | 변경 |
|----------|------|
| Web (`src/constants/`) | violation-types.ts 신규, br-form-types.ts 리팩토링 |
| Extension (`shared/constants.ts`) | 9개 L1 코드로 통일 |
| Crawler (`ai/prompts.ts`) | L1 코드 기준으로 프롬프트 업데이트 |
| DB | `reports.br_form_type` 값 마이그레이션 (other_policy → main_image 등) |

---

## 5. Next Steps

1. [ ] 2026-03-19: Plan 확정 (`/pdca plan violation-type-unification`)
2. [ ] Design 문서 작성
3. [ ] 구현 (Do)
4. [ ] Gap Analysis (Check)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | 2026-03-18 | CTO 초안 (2-Layer 구조) |
| 0.2 | 2026-03-18 | PM 논의 반영 — Extension 9개 기준 확정, 크롤러 5개/수동 4개 구분 |
