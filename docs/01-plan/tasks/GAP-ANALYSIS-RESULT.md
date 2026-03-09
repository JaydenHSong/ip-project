# QA Gap Analysis Report — 10 Tasks

- **분석일**: 2026-03-06
- **분석자**: QA Engineer (Claude)
- **대상**: TASK-01 ~ TASK-11 (TASK-09 제외, 총 10개)
- **방법**: 설계 문서 vs 실제 코드 대조, 타입 정합성, 엣지 케이스 확인

---

## Critical Gap Summary

> **Critical gap 0건** — Critical 수준의 누락 없음.

---

## TASK-01: 리포트 큐 ASIN 클릭 시 바로 디테일 이동 — PASS

| 항목 | 상태 | 설명 |
|------|------|------|
| SlidePanel 제거 (미리보기용) | PASS | `previewReportId` state 및 미리보기 SlidePanel 완전 제거 |
| 행 클릭 -> /reports/[id] 이동 | PASS | 모바일 `ReportsContent.tsx:337`, 데스크톱 `:408` — `router.push()` 적용 |
| 체크박스/행 클릭 분리 | PASS | `:410` `e.stopPropagation()` 으로 분리 |
| cursor-pointer 적용 | PASS | `:407` 데스크톱 tr에 `cursor-pointer` 적용 |
| 모바일 동작 | PASS | `:334-366` `<button>` 래퍼로 터치 대응 |

**참고**: SlidePanel이 여전히 import되어 있으나 **신규 리포트 작성용**이므로 정상. 미리보기용 SlidePanel은 제거됨.

---

## TASK-02: 뒤로가기 버튼 가시성 개선 — PASS (수정 완료)

| 항목 | 상태 | 설명 |
|------|------|------|
| BackButton.tsx 생성 | PASS | `src/components/ui/BackButton.tsx` 존재 |
| Props (href, label, onClick) | PASS | `:6-10` 모두 구현 |
| 아이콘 크기 24x24 | PASS | `:18` `h-6 w-6` (수정 완료) |
| 최소 터치영역 36x36 | PASS | `:14` `min-w-[36px] min-h-[36px]` (수정 완료) |
| text-th-text-primary | PASS | `:14` (수정 완료) |
| ReportDetailContent.tsx 적용 | PASS | `:197` `<BackButton href="/reports" />` |
| NewReportForm.tsx 적용 | PASS | `:248` `<BackButton href="/reports" />` (수정 완료) |
| CampaignDetailContent.tsx 적용 | PASS | `:88` `<BackButton href="/campaigns" />` (수정 완료) |

**수정 이력**:
- `BackButton.tsx` — 아이콘 h-5 w-5 -> h-6 w-6, 터치영역 min-w/h-[36px] 추가, text-th-text -> text-th-text-primary
- `NewReportForm.tsx:248` — 구식 SVG 뒤로가기 -> `<BackButton>` 교체
- `CampaignDetailContent.tsx:88` — 구식 SVG 뒤로가기 -> `<BackButton>` 교체

---

## TASK-03: Apply Template 사이드 패널 디자인 완성 — PASS

| 항목 | 상태 | 설명 |
|------|------|------|
| 패널 헤더 (제목, 닫기, 위반유형) | PASS | `TemplatePanel.tsx:85-96` |
| 카드형 목록 + 배지 + 미리보기 | PASS | `:164-244` 카드, 3줄 truncate, 배지 |
| 매칭 템플릿 상단 고정 | PASS | `:46-52` 정렬 로직 |
| "Use This Template" 버튼 | PASS | `:208-215` -> draft_body 반영 |
| 변수 자동 치환 | PASS | `interpolate.ts:21-34` — 10개 변수 전부 |
| 빈 상태 메시지 | PASS | `:145-152` |
| 모바일 반응형 | PASS | SlidePanel 전체 화면 대응 |

---

## TASK-04: 설정 익스텐션 페이지 디자인 개선 — PASS

| 항목 | 상태 | 설명 |
|------|------|------|
| Modern Stepper | PASS | `ExtensionGuide.tsx:118-170` — scale, accent, 체크마크 |
| 카드 + 아이콘 UI | PASS | `:63-109` — Card 컴포넌트 + 7개 lucide 아이콘 |
| 다운로드 버튼 강조 | PASS | `:91` `variant="primary"` + 큰 사이즈 |
| Version History 타임라인 | PASS | `:336-411` — dot, 세로 라인, 토글 |
| 모바일 반응형 | PASS | md: 브레이크포인트 다수 적용 |
| 다크 모드 | PASS | th- 프리픽스 토큰 전체 적용 |

---

## TASK-05: Complete 리포트 리스팅 클릭 버그 — PASS

| 항목 | 상태 | 설명 |
|------|------|------|
| ASIN 클릭 -> 아마존 새 탭 | PASS | `ReportDetailContent.tsx:87-90` `getAmazonUrl()` + `target="_blank"` |
| 마켓플레이스별 URL (8개) | PASS | US/UK/JP/DE/FR/IT/ES/CA 지원 |
| 모든 상태에서 동작 | PASS | `:283-369` listing 존재 시 무조건 표시 |
| /reports 잘못된 이동 없음 | PASS | 리스팅 영역에 잘못된 링크 없음 |

---

## TASK-06: 리포트 삭제 + 벌크 삭제 — PASS

| 항목 | 상태 | 설명 |
|------|------|------|
| DELETE /api/reports/[id] | PASS | `route.ts:89-148` — RBAC 구현 |
| Admin 모든 삭제 가능 | PASS | `:118` isAdmin 체크 |
| Editor 본인 draft/pending만 | PASS | `:118-133` 상태+소유권 체크 |
| Viewer 삭제 불가 | PASS | 403 반환 |
| /api/reports/bulk-delete | PASS | `bulk-delete/route.ts:1-78` — max 50, 개별 권한 |
| 단건 삭제 확인 모달 | PASS | `ReportActions.tsx:338-360` |
| 벌크 삭제 확인 모달 | PASS | `ReportsContent.tsx:478-500` |
| 삭제 후 목록 새로고침 | PASS | `router.refresh()` 호출 |

---

## TASK-07: 벌크 Submit — PASS (수정 완료)

| 항목 | 상태 | 설명 |
|------|------|------|
| POST /api/reports/bulk-submit | PASS | `bulk-submit/route.ts:1-105` |
| draft -> pending_review | PASS | `:33-34, 40` |
| approved -> sc_submitting (PD Reporting) | PASS | `:54-84` + buildScSubmitData |
| 벌크 액션 바 — Submit Review | PASS | `ReportsContent.tsx:275-283` |
| 벌크 액션 바 — Submit SC | PASS | `:294-302` |
| 부분 실패 에러 표시 | PASS | `:165-167` alert 표시 |
| Max 50개 배치 제한 | PASS | `bulk-submit/route.ts:22-27` |
| PATCH allowedFields resubmit_interval_days | PASS | `route.ts:56` (수정 완료) |

**수정 이력**:
- `src/app/api/reports/[id]/route.ts:53-57` — `allowedFields` 배열에 `'resubmit_interval_days'` 추가. 이전에는 `ReportDetailContent.tsx:150-166`의 `handleResubmitIntervalChange()`가 PATCH 요청을 보내도 allowedFields 화이트리스트에 없어 DB에 저장되지 않는 사일런트 실패 버그 존재.

---

## TASK-08: 크롤러 파이프라인 V2 — PASS

| 항목 | 상태 | 설명 |
|------|------|------|
| variationCount 파싱 | PASS | `search-page.ts:242-256` |
| 1차 스캔 로직 | PASS | `jobs.ts:91-109` `preScanSearchResults()` |
| 의심 건만 상세 진입 | PASS | `click-strategy.ts` — innocent 1~2개 혼입 |
| crawler/src/ai/ 모듈 | PASS | `violation-scanner.ts` + `vision-analyzer.ts` |
| Haiku 모델 호출 | PASS | `vision-analyzer.ts:88` `claude-haiku-4-5-20251001` |
| @anthropic-ai/sdk 의존성 | PASS | `crawler/package.json:13` |
| 스크린샷 Storage 업로드 | PASS | `batch/route.ts:27-57` `uploadScreenshot()` |
| 크롤러 AI 결과 참고 | PASS | `job-processor.ts:98-117` |
| CrawlerAiResult 타입 | PASS | `crawler/src/types/index.ts:24-31` |

---

## TASK-10: 멀티 ASIN 신고 지원 — PASS

| 항목 | 상태 | 설명 |
|------|------|------|
| DB 마이그레이션 | PASS | `018_add_related_asins.sql` — JSONB DEFAULT '[]' |
| RelatedAsin 타입 | PASS | `types/reports.ts:37-41` |
| NewReportForm 멀티 입력 | PASS | `:311-347` "+ Add ASIN" 버튼, max 50 |
| ReportDetail 표시 | PASS | `ReportDetailContent.tsx:346-366` + 아마존 링크 |
| 목록 배지 (+N) | PASS | `ReportsContent.tsx:350-354`(모바일), `427-431`(데스크톱) |
| API POST/GET related_asins | PASS | `reports/route.ts:69, 126` |
| SC 데이터 반영 | PASS | `submit-sc/route.ts:26, 54-60` |

---

## TASK-11: Notices 독립 페이지 — PASS (문서 수정 완료)

| 항목 | 상태 | 설명 |
|------|------|------|
| /notices 페이지 생성 | PASS | `notices/page.tsx` 존재 |
| NoticesContent.tsx | PASS | 카드 리스트 + 테이블 구현 |
| Admin/Owner CRUD | PASS | canCreate 조건으로 버튼 표시 |
| 사이드바 메뉴 추가 | PASS | `Sidebar.tsx:39` Megaphone 아이콘, 전 역할 접근 |
| 설정에서 notices 탭 제거 | PASS | `SettingsContent.tsx`에서 notices 없음 |
| NoticeDropdown "View All" | PASS | `:79` `href="/notices"` |
| PUT/DELETE API | PASS | `/api/notices/[id]/route.ts` 존재 |
| 카테고리 필터 탭 | PASS | All / Update / Policy / Notice / System (문서 수정 완료) |

**수정 이력**:
- `TASK-11-notices-independence.md:36` — 카테고리 필터 문서를 실제 구현에 맞게 수정 (Fix, AI -> Notice, System)

---

## 전체 요약

| Task | 결과 | Critical | Medium | Low | 비고 |
|------|------|:--------:|:------:|:---:|------|
| TASK-01 | PASS | 0 | 0 | 0 | |
| TASK-02 | PASS | 0 | 0 | 0 | 수정 3건 적용 |
| TASK-03 | PASS | 0 | 0 | 0 | |
| TASK-04 | PASS | 0 | 0 | 0 | |
| TASK-05 | PASS | 0 | 0 | 0 | |
| TASK-06 | PASS | 0 | 0 | 0 | |
| TASK-07 | PASS | 0 | 0 | 0 | 수정 1건 적용 |
| TASK-08 | PASS | 0 | 0 | 0 | |
| TASK-10 | PASS | 0 | 0 | 0 | |
| TASK-11 | PASS | 0 | 0 | 0 | 문서 수정 1건 |
| **합계** | **10/10 PASS** | **0** | **0** | **0** | |

---

## 수정 내역 (이번 분석에서 적용)

| # | 심각도 | 태스크 | 수정 파일 | 내용 |
|---|--------|--------|----------|------|
| 1 | Medium | TASK-02 | `src/app/(protected)/reports/new/NewReportForm.tsx` | 구식 SVG 뒤로가기 -> `<BackButton>` 교체 |
| 2 | Medium | TASK-02 | `src/app/(protected)/campaigns/[id]/CampaignDetailContent.tsx` | 구식 SVG 뒤로가기 -> `<BackButton>` 교체 |
| 3 | Medium | TASK-07 | `src/app/api/reports/[id]/route.ts` | `allowedFields`에 `resubmit_interval_days` 추가 (사일런트 실패 버그) |
| 4 | Low | TASK-02 | `src/components/ui/BackButton.tsx` | 아이콘 20->24, 터치영역 36px 보장, text-th-text-primary |
| 5 | Low | TASK-11 | `docs/01-plan/tasks/TASK-11-notices-independence.md` | 카테고리 필터 문서를 실제 구현에 맞게 수정 |

---

## 검증 환경

- `pnpm typecheck` — PASS (에러 0)
- `pnpm lint` — 수정 파일에서 신규 에러 없음 (기존 warning만 존재)
