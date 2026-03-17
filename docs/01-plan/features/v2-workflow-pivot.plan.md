# v2 Workflow Pivot — Plan

> **Feature**: Sentinel v2 워크플로우 대전환 — BR 단일 트랙, 레거시 위반 코드 제거, 수집 3경로, AI 제안자 역할
> **Created**: 2026-03-11
> **Phase**: Plan
> **Priority**: Critical
> **Miro Board**: https://miro.com/app/board/uXjVGzbA7VM=/

---

## 1. Background

### 미로 싱크 (2026-03-11)

기존 v1 워크플로우와 실제 운영 방향이 크게 달랐음. 미로에서 시각화 후 싱크한 결과 v2로 대전환 결정.

### v1 문제점
- PD/BR 동시 트랙 → 과도한 복잡도
- AI가 위반 판단 + 드래프트 전체 작성 → 운영자 적응 어려움
- V01~V19 (19개 위반 유형) → 실제 BR 폼 타입과 불일치
- 30분 주기 모니터링 → 과도한 리소스
- 자동 재신고 루프 → 운영자 통제 불가

### v2 핵심 방향
- **심플하게** — 운영자 적응 우선, 점진적 자동화
- **BR 단일 트랙** — PD는 Extension 단발성으로 분리
- **Extension 카테고리 = BR 폼 타입 = 템플릿 카테고리** — 한 체계로 통일
- **AI = 제안자** — 판단자 아님

---

## 2. Goals

| # | Goal | Description |
|---|------|-------------|
| G1 | 레거시 위반 코드 제거 | V01~V19, constants/violations.ts, AI 위반 분류 코드 전부 제거 |
| G2 | BR 폼 타입 기반 통일 | Extension 카테고리 = BR 폼 타입 = 템플릿 카테고리 |
| G3 | 수집 3경로 | Crawler + Extension + Admin 수동 작성 |
| G4 | BR 단일 파이프라인 | PD를 메인 파이프라인에서 분리 |
| G5 | PD Extension 단발성 | PD 기록 없음, 토글 ON/OFF |
| G6 | AI 역할 축소 | 템플릿 톤/매너 제안만, 판단 X |
| G7 | Admin 역할 확대 | 템플릿 내용 수정 (subject/title/body/url) |
| G8 | 모니터링 축소 | BR만, 일 2회 |
| G9 | 수동 클론 | Admin이 판단, 기준일 설정에서 지정 |

---

## 3. Scope

### 3.1 In Scope

| # | Work Item | Detail | 규모 |
|---|-----------|--------|------|
| W1 | 레거시 위반 코드 제거 | V01~V19 상수, violations.ts, 위반 분류 로직, AI 분석 Decision 코드 전부 제거 | Large |
| W2 | BR 폼 타입 체계 정의 | Extension 카테고리와 1:1 매핑되는 BR 폼 타입 상수 정의 | Small |
| W3 | DB 스키마 정리 | violation_category, violation_type 컬럼 → br_form_type 기반으로 전환 | Medium |
| W4 | 템플릿 카테고리 재매핑 | report_templates의 카테고리를 BR 폼 타입 기준으로 통일 | Medium |
| W5 | Admin 수동 리포트 작성 | 웹에서 Admin이 직접 리포트 생성하는 UI + API (3번째 수집 경로) | Medium |
| W6 | PD 메인 파이프라인 제거 | PD 관련 웹 코드 정리 (이미 일부 삭제됨) | Small |
| W7 | Extension PD 토글 | PD 신고 기능 ON/OFF 토글 (Extension 설정) | Small |
| W8 | Extension PD 기록 제거 | PD 데이터 웹 전송 중단, 기록 없음 | Small |
| W9 | AI 역할 축소 | 드래프트 전체 작성 → 템플릿 톤/매너 제안으로 변경 | Medium |
| W10 | Admin 템플릿 수정 플로우 | 승인 플로우를 "템플릿에서 가져와서 수정 → Submit"으로 변경 | Medium |
| W11 | 모니터링 주기 변경 | BR 30분 → 일 2회, 리스팅 모니터링 제거 | Small |
| W12 | 클론 기준일 설정 | Settings에서 Admin이 클론 기준 일수 설정 | Small |
| W13 | 클론 기능 | Admin이 미해결 케이스를 수동으로 클론 + 기존 닫기 | Medium |

### 3.2 Out of Scope (향후)
- AI 관여 단계적 확대 (v3)
- PD 모니터링 재도입 (필요 시)
- 자동 클론 (운영 데이터 축적 후)
- AI 위반 판단 재도입 (운영자 적응 후)

---

## 4. BR 폼 타입 체계 (NEW)

### Extension 카테고리 ↔ BR 폼 타입 매핑

| Extension 1단 카테고리 | BR 폼 타입 (Amazon 메뉴) | 주요 필드 |
|----------------------|------------------------|----------|
| IP (Trademark/Copyright/Patent) | Report an IP violation | (별도 Report a violation 도구) |
| Product not as described | Product not as described | Description, URLs, Seller URL, Policy URL |
| Incorrect variation | Incorrect variation | Description, URLs |
| Product review violation | Product review violation | Description, ASINs, Review URLs, Order ID |
| Other policy violations | Other policy violations | Description, URLs, Seller URL, Policy URL |
| Listing issue | Listing issue | (확인 필요) |

> **원칙**: Extension 카테고리 = BR 폼 타입 = 템플릿 카테고리 (1:1:1)

---

## 5. 데이터 흐름 (v2)

```
[수집 3경로]
  Crawler → 리스팅 데이터 → Web API → 메인 파이프라인
  Extension → BR Draft → Web API → 메인 파이프라인
  Extension → PD 신고 → 아마존에서 끝 (웹 전송 X, 기록 X)
  Admin → 수동 작성 → 메인 파이프라인

[메인 파이프라인 = BR 전용]
  드래프트 생성 (템플릿 + AI 톤 제안)
  → Admin 템플릿 내용 수정 (subject/title/body/url)
  → Submit
  → Crawler가 BR 자동 제출
  → 모니터링 (일 2회)
  → 미해결 시 Admin 수동 클론 (기준일 설정)
```

---

## 6. 삭제 대상 코드 (레거시 정리)

### 확정 삭제
| 파일/모듈 | 사유 |
|----------|------|
| `src/constants/violations.ts` | V01~V19 전체 제거, BR 폼 타입으로 대체 |
| `src/constants/pd-submission-paths.ts` | PD 제거 (이미 삭제됨) |
| `src/lib/reports/pd-data.ts` | PD 제거 (이미 삭제됨) |
| `src/app/api/crawler/pd-*` | PD API 제거 (이미 삭제됨) |
| `src/app/api/reports/[id]/submit-pd` | PD 제출 제거 (이미 삭제됨) |
| `crawler/src/pd-submit/*` | PD 크롤러 제거 (이미 삭제됨) |
| AI 위반 분류 로직 | AI Decision 코드 제거 |
| 리스팅 모니터링 코드 | Track 1 제거 |

### 확인 필요
| 파일/모듈 | 확인 사항 |
|----------|----------|
| `src/types/reports.ts` | violation_category, violation_type 타입 → br_form_type 전환 |
| `extension/src/content/*` | PD 신고 관련 content script → 토글 제어 |
| `src/app/api/reports/[id]/approve` | 승인 → 템플릿 수정 플로우 변경 |
| `src/lib/ai/*` | AI 드래프트 전체 작성 → 톤 제안으로 축소 |
| DB: reports 테이블 | violation_category/type 컬럼 마이그레이션 |

---

## 7. Implementation Phases

### Phase 1: 레거시 정리 + BR 폼 타입 통일 (Foundation)
- W1: 레거시 위반 코드 제거
- W2: BR 폼 타입 상수 정의
- W3: DB 스키마 전환
- W4: 템플릿 카테고리 재매핑
- W6: PD 메인 파이프라인 잔여 코드 제거

### Phase 2: Admin 역할 확대 + 수집 경로 (Core Flow)
- W5: Admin 수동 리포트 작성
- W9: AI 역할 축소
- W10: Admin 템플릿 수정 플로우

### Phase 3: Extension + 모니터링 (Periphery)
- W7: Extension PD 토글
- W8: Extension PD 기록 제거
- W11: 모니터링 주기 변경
- W12: 클론 기준일 설정
- W13: 클론 기능

---

## 8. Risks and Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| DB 마이그레이션 (violation → br_form_type) | 기존 데이터 깨짐 | 마이그레이션 스크립트 + 롤백 플랜 |
| Extension 업데이트 배포 | 사용자 혼란 | PD 토글 기본값 ON → 점진적 OFF |
| 레거시 코드 의존성 누락 | 빌드 실패 | 삭제 전 grep으로 참조 전수 조사 |
| 운영 중 데이터 연속성 | 기존 리포트 깨짐 | violation_type → br_form_type 매핑 테이블 |

---

## 9. Success Criteria

- [ ] `pnpm typecheck && pnpm lint && pnpm build` 성공
- [ ] V01~V19 코드 전체 제거 확인 (grep으로 잔여 없음)
- [ ] BR 폼 타입 기반 템플릿 매핑 동작
- [ ] Admin 수동 리포트 작성 → BR 제출까지 E2E 동작
- [ ] Extension PD 토글 ON/OFF 동작
- [ ] 모니터링 일 2회 동작
- [ ] 클론 기능 동작 (설정 기준일 반영)
- [ ] 기존 리포트 데이터 마이그레이션 무결성

---

## 10. Reference

- Miro Board: https://miro.com/app/board/uXjVGzbA7VM=/
- BR 스크린샷: `Screenshot/Brand-registry/` (10장)
- 기존 Plan: `docs/01-plan/features/br-form-enhancement.plan.md`
- Extension Violation Form: archived (100% 완료)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | 2026-03-11 | Initial draft — 미로 싱크 기반 v2 대전환 플랜 |
