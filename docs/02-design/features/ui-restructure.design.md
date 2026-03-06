# UI Restructure Design — 설정 간소화 + 대시보드 위젯화

## 1. Notices 독립 페이지

### 라우팅
- `/notices` — 신규 페이지

### 역할별 동작

| 역할 | /notices 페이지 | 사이드바 메뉴 | 헤더 드롭다운 |
|------|----------------|-------------|-------------|
| Owner | CRUD (생성/수정/삭제) | O | O |
| Admin | CRUD (생성/수정/삭제) | O | O |
| Editor | 읽기 전용 | O | O |
| Viewer | 읽기 전용 | O | O |

### 페이지 레이아웃

```
/notices
┌─────────────────────────────────────────────┐
│ Notices                    [+ New Notice]   │  <- Admin/Owner만
├─────────────────────────────────────────────┤
│ ┌─ Filter ────────────────────────────────┐ │
│ │ All | Update | Fix | Policy | AI        │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─ Notice Card ───────────────────────────┐ │
│ │ [Update] Extension v1.4.0 Released      │ │
│ │ New SC form filler, i18n support...     │ │
│ │ System - 2 hours ago          [Edit][X] │ │  <- Admin/Owner만
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─ Notice Card ───────────────────────────┐ │
│ │ [Policy] V10 Variation 기준 변경         │ │
│ │ 7개 이상 베리에이션...                    │ │
│ │ Admin User - 1 day ago                  │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### 생성/수정 폼

기존 NoticesTab의 폼을 모달로 변환:
- Category: select (update, fix, policy, ai)
- Title: text input (필수)
- Description: textarea (선택)

### 사이드바 메뉴 위치

```
Dashboard
Campaigns
Report Queue
Completed Reports
Patents
Notices          <- 여기 추가 (Patents 아래)
─────────────
Settings
```

### 설정에서 제거

SettingsContent.tsx에서:
- ADMIN_TABS에서 'notices' 제거
- OWNER_TABS에서 'notices' 제거
- NoticesTab import/render 제거

---

## 2. 대시보드 위젯 시스템

### 위젯 목록

| 위젯 ID | 이름 | 기본 크기 | 최소 크기 | 역할 제한 |
|---------|------|----------|----------|----------|
| stats | Stats Overview | 12x2 | 6x2 | - |
| report-trend | Report Trend | 8x4 | 4x3 | - |
| violation-dist | Violation Distribution | 4x4 | 4x3 | - |
| status-pipeline | Status Pipeline | 6x4 | 4x3 | - |
| ai-performance | AI Performance | 6x4 | 4x3 | - |
| top-violations | Top Violations | 12x4 | 6x3 | - |
| recent-reports | Recent Reports | 6x5 | 4x3 | - |
| active-campaigns | Active Campaigns | 6x5 | 4x3 | - |
| system-status | System Status | 12x3 | 6x2 | Owner |

Grid: 12 columns, row height ~80px

### 위젯 컴포넌트 구조

```typescript
type WidgetConfig = {
  id: string
  title: string
  minRole?: Role          // 역할 제한 (없으면 모두)
  defaultLayout: {
    x: number
    y: number
    w: number
    h: number
    minW: number
    minH: number
  }
}

type UserDashboardLayout = {
  widgets: {
    id: string
    x: number
    y: number
    w: number
    h: number
    visible: boolean
  }[]
}
```

### 위젯 UI 요소

각 위젯 공통:
```
┌─ Widget Header ──────────────────────┐
│ [drag handle] Title        [eye] [X] │  <- 드래그, 숨김, 제거
├──────────────────────────────────────┤
│                                      │
│         Widget Content               │
│                                      │
└──────────────────────────────────────┘
```

- 드래그 핸들: 헤더 좌측 grip 아이콘 (::)
- 숨김 토글: 눈 아이콘 (위젯 숨김, 레이아웃에서 제거)
- 리사이즈: 우하단 코너 드래그

### 위젯 추가 패널

숨긴 위젯을 다시 추가하는 UI:

```
┌─ Dashboard ──────────── [+ Add Widget] ─┐
                                │
                    ┌───────────▼──────────┐
                    │ Hidden Widgets       │
                    │                      │
                    │ [+] Stats Overview   │
                    │ [+] AI Performance   │
                    │ [+] System Status    │
                    └──────────────────────┘
```

### 레이아웃 저장

#### DB 스키마

```sql
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  preference_key TEXT NOT NULL,
  preference_value JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, preference_key)
);

CREATE INDEX idx_user_prefs_user ON user_preferences(user_id);
```

사용:
```typescript
// preference_key: 'dashboard_layout'
// preference_value: UserDashboardLayout JSON
```

#### API

```
GET  /api/user/preferences?key=dashboard_layout
PUT  /api/user/preferences
  body: { key: 'dashboard_layout', value: UserDashboardLayout }
```

#### 저장 타이밍
- 위젯 이동/리사이즈 완료 시 debounce 1초 후 자동 저장
- 위젯 표시/숨김 토글 시 즉시 저장

### 모바일 대응

- 768px 이하: 단일 컬럼 고정 (드래그/리사이즈 비활성화)
- 위젯 순서만 변경 가능 (상/하 이동)
- 숨김 토글은 유지

### 라이브러리

- `react-grid-layout`: 드래그 + 리사이즈 + 반응형
- 설치: `pnpm add react-grid-layout @types/react-grid-layout`

### 설정에서 System Status 제거

SettingsContent.tsx에서:
- OWNER_TABS에서 'system-status' 제거
- SystemStatusTab import/render 제거

---

## 3. 컴포넌트 구조

### 신규 파일

```
src/
  app/(protected)/
    notices/
      page.tsx                    -- 서버 컴포넌트 (역할 체크)
      NoticesContent.tsx          -- 클라이언트 컴포넌트
    dashboard/
      widgets/
        WidgetWrapper.tsx         -- 위젯 공통 래퍼 (헤더, 드래그, 숨김)
        StatsWidget.tsx           -- 기존 stats grid 분리
        ReportTrendWidget.tsx     -- 기존 chart 분리
        ViolationDistWidget.tsx
        StatusPipelineWidget.tsx
        AiPerformanceWidget.tsx
        TopViolationsWidget.tsx
        RecentReportsWidget.tsx
        ActiveCampaignsWidget.tsx
        SystemStatusWidget.tsx    -- 기존 SystemStatusTab 이동
        AddWidgetPanel.tsx        -- 숨긴 위젯 추가 패널
      DashboardContent.tsx        -- 기존 파일 리팩토링
  app/api/
    user/
      preferences/
        route.ts                  -- GET/PUT
  supabase/migrations/
    0XX_user_preferences.sql
```

### 기존 파일 수정

```
src/components/layout/Sidebar.tsx       -- Notices 메뉴 추가
src/app/(protected)/settings/SettingsContent.tsx  -- notices, system-status 탭 제거
```
