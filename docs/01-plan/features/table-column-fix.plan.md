# Plan: table-column-fix

## Overview
전체 테이블의 header/body 분리 구조에서 발생하는 컬럼 정렬 문제 수정.
스크롤바 유무에 따른 header-body 너비 불일치를 근본적으로 해결한다.

## Problem
현재 모든 주요 테이블이 "pocket scroll" 패턴 사용:
- `<table>` (thead만) — 고정
- `<div overflow-y-auto>` → `<table>` (tbody만) — 스크롤

body에 스크롤바가 나타나면 header 대비 ~15px 좁아져서 컬럼이 어긋남.

## Affected Files
1. `src/app/(protected)/reports/ReportsContent.tsx` (11 columns)
2. `src/app/(protected)/reports/completed/CompletedReportsContent.tsx`
3. `src/app/(protected)/patents/PatentsContent.tsx` (8 columns)
4. `src/app/(protected)/campaigns/CampaignsContent.tsx` (8-9 columns)

## Solution
단일 `<table>` + `<thead>` sticky 패턴으로 전환:
```
<div className="overflow-y-auto">
  <table>
    <thead className="sticky top-0 z-10 bg-th-bg-tertiary">
      ...
    </thead>
    <tbody>
      ...
    </tbody>
  </table>
</div>
```
이렇게 하면 header와 body가 같은 테이블 안에 있어 자동 정렬.

## Requirements
- REQ-1: 4개 테이블 모두 single-table + sticky thead로 전환
- REQ-2: 기존 스타일 (hover, border, shadow) 유지
- REQ-3: 정렬/체크박스 등 기존 기능 영향 없음
- REQ-4: 빈 데이터 상태 (colSpan) 정상 동작

## Complexity: Small
예상 변경: 4 files, 구조 변경만 (로직 변경 없음)
