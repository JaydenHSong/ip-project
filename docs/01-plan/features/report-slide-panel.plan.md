# Plan: report-slide-panel

## Overview
Report Queue / Completed Reports 에서 ASIN 클릭 시 풀 페이지 이동 대신
오른쪽 SlidePanel로 디테일 표시. 리스트 컨텍스트를 유지하면서 상세 확인 가능.

## Current Behavior
- ASIN (row) 클릭 → `router.push('/reports/${id}')` → 풀 페이지 이동
- 돌아가려면 뒤로가기 필요, 리스트 상태 (페이지, 필터, 스크롤) 유실

## Target Behavior
- ASIN (row) 클릭 → SlidePanel 열림 (size="xl", 58vw)
- 패널 안에 Report 상세 정보 표시 (ReportDetailContent 핵심 요소)
- 풀 페이지 링크도 패널 헤더에 유지 (deep link 보존)
- 모바일: 기존대로 풀 페이지 이동 유지

## Reference
- `CampaignDetailContent.tsx`: 이미 동일 패턴 구현 (listing row → SlidePanel)
- `SlidePanel` 컴포넌트 이미 존재 (src/components/ui/SlidePanel.tsx)

## Requirements
- REQ-1: ReportsContent — row 클릭 → SlidePanel (desktop), router.push (mobile)
- REQ-2: CompletedReportsContent — 동일 패턴 적용
- REQ-3: SlidePanel 내 Report 상세 (violation, ASIN, AI analysis, timeline, actions)
- REQ-4: 패널 헤더에 "Open full page" 링크
- REQ-5: 기존 `/reports/[id]` 풀 페이지 라우트 유지 (직접 URL 접근용)

## Dependencies
- `table-column-fix` 먼저 완료 (테이블이 깔끔해야 패널이 의미 있음)

## Complexity: Medium
예상 변경: 3-4 files (ReportsContent, CompletedReportsContent, 공통 패널 컴포넌트)
