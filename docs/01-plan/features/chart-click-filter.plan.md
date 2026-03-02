# Chart Click-Through Filter Plan

## Feature ID
`chart-click-filter`

## Summary
대시보드 차트 요소를 클릭하면 해당 조건으로 필터링된 Reports 페이지로 이동하는 기능.

## Problem
대시보드 차트에서 특정 위반 카테고리, 상태, 위반 코드 등의 데이터를 보고 해당 케이스를 확인하려면 수동으로 Reports 페이지에서 필터를 설정해야 함.

## Solution
각 차트 요소에 `onClick` 핸들러를 추가하여 클릭 시 `/reports?filter=value` 형태로 자동 이동.

## Click-Through Mapping

| 차트 | 클릭 요소 | 이동 URL | 비고 |
|------|-----------|----------|------|
| ViolationDistChart | 파이 슬라이스 (카테고리) | `/reports?category={category}` | 새 URL 파라미터 필요 |
| StatusPipelineChart | 바 (상태) | `/reports?status={status}` | 기존 파라미터 활용 |
| TopViolationsChart | 바 (위반 코드) | `/reports?violation_type={code}` | 기존 파라미터 활용 |
| AiPerformanceCard | Disagreement Rate 영역 | `/reports?disagreement=true` | 기존 파라미터 활용 |
| ReportTrendChart | 클릭 없음 | — | 날짜 기반 필터 필요 없음 (날짜 필터 미구현) |

## Implementation Scope

### 1. Reports 서버 필터 확장 (reports/page.tsx)
- `category` URL 파라미터 추가
- category → violation_type 다중 매핑 (예: `intellectual_property` → `V01,V02,V03,V04`)
- Demo mode + Supabase 모두 대응

### 2. Chart 컴포넌트에 `onClickItem` 콜백 추가
- ViolationDistChart: `Pie onClick` → `onClickItem(category)`
- StatusPipelineChart: `Bar onClick` → `onClickItem(status)`
- TopViolationsChart: `Bar onClick` → `onClickItem(code)`
- AiPerformanceCard: Disagreement 영역 클릭 → `onClickItem('disagreement')`
- 각 차트에 `cursor: pointer` 스타일 추가

### 3. DashboardContent에서 `useRouter` 연결
- 각 차트의 `onClickItem`에 `router.push('/reports?...')` 연결

### 4. i18n 키 추가 (선택)
- 차트 클릭 시 tooltip hint 텍스트 (예: "Click to view details")

## Out of Scope
- ReportTrendChart 날짜 범위 필터
- 새 페이지 생성 없음 (기존 `/reports` 재활용)

## Modified Files
| 파일 | 변경 |
|------|------|
| `src/app/(protected)/reports/page.tsx` | `category` 파라미터 추가 |
| `src/app/(protected)/reports/ReportsContent.tsx` | category 필터 표시 배지 추가 |
| `src/components/features/charts/ViolationDistChart.tsx` | `onClickItem` prop + Pie onClick |
| `src/components/features/charts/StatusPipelineChart.tsx` | `onClickItem` prop + Bar onClick |
| `src/components/features/charts/TopViolationsChart.tsx` | `onClickItem` prop + Bar onClick |
| `src/components/features/charts/AiPerformanceCard.tsx` | Disagreement 클릭 |
| `src/app/(protected)/dashboard/DashboardContent.tsx` | useRouter + onClick 핸들러 연결 |
| `src/lib/i18n/locales/en.ts` | 클릭 힌트 텍스트 |
| `src/lib/i18n/locales/ko.ts` | 클릭 힌트 텍스트 |
