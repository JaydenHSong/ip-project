# Session Brief: Mobile UI Improvement

## Status: DONE
## Assigned Session: 2026-03-06
## Completed At: 2026-03-06

---

## Goal
모바일 환경에서 깔끔하고 정돈된 UI로 개선. 하단 탭바 확장, 헤더 간소화, 반응형 레이아웃 안정화.

## Priority: HIGH

---

## Task 1: Header 간소화

### File: `src/components/layout/Header.tsx`

**현재 상태** (line 37-40):
```tsx
<Link href="/dashboard" className="flex items-center gap-2 md:hidden">
  <SpigenLogo className="h-6 w-5 text-th-accent" />
  <span className="text-lg font-bold text-th-text">Spigen Sentinel</span>
</Link>
```

**변경 사항**:
- 모바일 헤더에서 "Spigen Sentinel" 텍스트 제거 -> 로고만 표시
- 사내 사용자이므로 브랜드명 불필요
- 로고 크기 살짝 키움 (h-7 w-6 정도)

**변경 후**:
```tsx
<Link href="/dashboard" className="md:hidden">
  <SpigenLogo className="h-7 w-6 text-th-accent" />
</Link>
```

### File: `src/components/layout/Sidebar.tsx` (line 131-139)

**변경 사항**:
- 사이드바 로고 옆 "Spigen Sentinel" 텍스트도 제거 고려 (데스크톱)
- 단, collapsed 상태에서는 이미 로고만 보이므로 expanded 상태만 변경
- 유저 의견: 로고만으로 충분 -> 텍스트 제거

---

## Task 2: 하단 탭바 (Bottom Tab Bar) 확장

### File: `src/components/layout/MobileTabBar.tsx`

**현재 구조** (3탭 + More):
- Dashboard, Campaigns, Report Queue, [More]
- More 누르면: Completed Reports, Notices, Settings

**변경 목표** (5탭 고정):
- Dashboard, Reports, Campaigns, Notices, More
- More 누르면: Patents, Completed Reports, Settings

**설계 포인트**:
1. 핵심 5개 고정 탭 (아이콘 + 라벨)
2. `Reports`는 `/reports` (Report Queue)로 이동
3. `Notices`를 탭바로 승격 (자주 확인하는 메뉴)
4. `Patents`, `Completed Reports`, `Settings`는 More 메뉴로
5. `More` 메뉴는 현재처럼 팝업 오버레이

**탭 구성**:
```tsx
const tabs = [
  { labelKey: 'nav.dashboard', href: '/dashboard', icon: LayoutDashboard },
  { labelKey: 'nav.reportQueue', href: '/reports', icon: FileWarning },
  { labelKey: 'nav.campaigns', href: '/campaigns', icon: Search },
  { labelKey: 'nav.notices', href: '/notices', icon: Megaphone },
]

const moreItems = [
  { labelKey: 'nav.patents', href: '/patents' },
  { labelKey: 'nav.completedReports', href: '/reports/completed' },
  { labelKey: 'nav.settings', href: '/settings' },
]
```

**Active state 규칙 (필수)**:
- 어떤 경로에서든 반드시 탭 하나가 active여야 함 (빈 상태 금지)
- `/reports` 탭과 `/reports/completed` More 항목이 URL prefix 겹침 -> 분기 필요
- `/reports/completed`는 More 메뉴의 active로 처리
- `/reports/[id]` (상세)는 Reports 탭의 active로 처리

| 현재 경로 | Active 탭 |
|-----------|-----------|
| `/dashboard` | Dashboard |
| `/reports`, `/reports/[id]` | Reports |
| `/campaigns`, `/campaigns/[id]` | Campaigns |
| `/notices` | Notices |
| `/reports/completed` | More |
| `/patents` | More |
| `/settings` | More |

```tsx
// Reports 탭: /reports exact + /reports/[id] (completed 제외)
const isReportsActive = pathname === '/reports' ||
  (pathname.startsWith('/reports/') && !pathname.startsWith('/reports/completed'))

// More: moreItems 중 하나라도 매칭
const isMoreActive = moreItems.some((item) => pathname.startsWith(item.href))
```

---

## Task 3: 반응형 헤더/페이지 타이틀 정리

### 문제
- 각 페이지의 헤더 타이틀이 모바일에서 두 줄로 줄바꿈되거나 튀어나감
- 필터 컨트롤과 타이틀이 같은 줄에 있을 때 좁은 화면에서 깨짐

### 해결 방향
1. 페이지 타이틀 + 액션 버튼 영역을 `flex-wrap` 또는 `flex-col` on mobile
2. 긴 텍스트는 `truncate` 또는 `text-sm` on mobile
3. 필터/버튼 그룹은 `w-full` on mobile로 가로 전체 차지

### 주요 파일:
- `src/app/(protected)/reports/ReportsContent.tsx` — 리포트 큐 헤더
- `src/app/(protected)/campaigns/CampaignsContent.tsx` — 캠페인 리스트 헤더
- `src/app/(protected)/dashboard/DashboardContent.tsx` — 대시보드 헤더
- `src/app/(protected)/notices/NoticesContent.tsx` — 공지사항 헤더
- `src/app/(protected)/patents/PatentsContent.tsx` — 특허 레지스트리 헤더

### 패턴 예시:
```tsx
{/* Bad: 모바일에서 한 줄에 다 넣으려 함 */}
<div className="flex items-center justify-between">
  <h1 className="text-2xl font-bold">Report Queue</h1>
  <div className="flex gap-2">{/* 필터들 */}</div>
</div>

{/* Good: 모바일에서 세로 정렬 */}
<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
  <h1 className="text-xl font-bold sm:text-2xl truncate">Report Queue</h1>
  <div className="flex flex-wrap gap-2">{/* 필터들 */}</div>
</div>
```

---

## Task 4: main 영역 padding 조정

### File: `src/components/layout/AppLayout.tsx` (line 47)

**현재**:
```tsx
<main className="flex-1 overflow-y-auto p-4 pb-20 md:p-6 md:pb-6">
```

- `pb-20`은 하단 탭바 공간 확보용 -> 탭바 높이에 맞게 적절한지 확인
- 탭바가 `h-16` + `mb-[env(safe-area-inset-bottom)]` 이므로 `pb-20`(80px) 적절

**확인 사항**:
- Safe area inset 적용 잘 되는지 (iPhone 노치/홈바)
- 스크롤 시 컨텐츠가 탭바에 가려지지 않는지

---

## Task 5: More 메뉴 디자인 개선

### File: `src/components/layout/MobileTabBar.tsx` (line 39-60)

**현재**: 단순한 드롭다운 팝업
**개선**:
- `glass-dropdown` 클래스 적용 (블러 효과)
- 각 항목에 아이콘 추가
- 좌측 아이콘 + 텍스트 구성
- rounded-xl 적용

```tsx
const moreItems = [
  { labelKey: 'nav.patents', href: '/patents', icon: Shield },
  { labelKey: 'nav.completedReports', href: '/reports/completed', icon: CheckCircle2 },
  { labelKey: 'nav.settings', href: '/settings', icon: Settings },
]
```

---

## Design Tokens Reference

모든 변경은 기존 디자인 토큰 시스템 사용:
- 배경: `bg-th-sidebar-bg`, `bg-surface-card`
- 텍스트: `text-th-text`, `text-th-text-secondary`, `text-th-accent`
- 보더: `border-th-border`, `border-th-sidebar-border`
- 액센트: `text-th-accent`, `bg-th-accent`
- 유틸리티: `glass`, `glass-dropdown`, `truncate`

---

## Validation Checklist

완료 후 반드시 확인:
1. `pnpm typecheck` PASS
2. `pnpm lint` 신규 에러 없음
3. iPhone SE (375px) 에서 탭바 5개 항목 잘 보이는지
4. iPad (768px) 에서 사이드바 표시, 탭바 숨김
5. 데스크톱 (1280px+) 에서 사이드바 정상
6. 다크 모드에서 모든 요소 가시성
7. 각 페이지 헤더가 모바일에서 한 줄 또는 깔끔한 두 줄 레이아웃
