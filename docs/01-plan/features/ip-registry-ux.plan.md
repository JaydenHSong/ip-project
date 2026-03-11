# Plan: ip-registry-ux

## Overview
IP Registry (Patents) SlidePanel의 UI를 완성도 있게 리디자인.
현재: 라벨-값이 단순 나열, 시각적 구분 부족, 정보 밀도 낮음.

## Current Problems
1. **구조**: 모든 필드가 동일한 `space-y-6` 나열 — 중요도 구분 없음
2. **라벨 스타일**: `text-xs uppercase text-th-text-tertiary` — 너무 작고 흐림
3. **그리드**: 2컬럼 그리드가 출원/등록 정보에만 적용, 나머지는 1컬럼
4. **이미지**: 16x16 썸네일이 너무 작아 내용 파악 불가
5. **섹션 구분**: 기본정보, 법적정보, 연관정보 등 그룹핑 없음
6. **빈 값**: 데이터 없는 필드는 숨김 → 어떤 정보가 있는지 파악 어려움

## Target Design
### 섹션 기반 레이아웃
1. **Header area** (패널 상단): 이름 + 타입/상태 뱃지 + 관리번호 (이미 있음)
2. **Overview section**: 설명, 국가, 담당자 — 카드 스타일
3. **Legal section**: 출원번호/일자, 등록번호/일자, 만료일 — 2컬럼 그리드, 구분선
4. **Assets section**: 이미지 갤러리 (크게), 관련 제품, 키워드 태그
5. **Admin section**: 편집/삭제 (기존 유지)

### 스타일 개선
- 섹션 제목: `text-xs font-semibold uppercase tracking-wider` + 하단 라인
- 값: font-medium, 충분한 크기
- 이미지: 최소 80x80, 클릭 시 원본 보기
- 태그/키워드: pill 스타일, accent 배경

## Requirements
- REQ-1: 섹션 기반 레이아웃 (Overview, Legal, Assets)
- REQ-2: 이미지 갤러리 크기 개선 (80x80 이상)
- REQ-3: 빈 섹션은 "—" 표시 (숨기지 않음)
- REQ-4: 기존 Admin 기능 (편집/삭제) 유지
- REQ-5: 기존 데이터 구조 변경 없음 (UI만 변경)

## Complexity: Small
예상 변경: 1 file (PatentsContent.tsx의 SlidePanel 내부만)
