# TASK-12: 대시보드 위젯 시스템 + System Status 이동

## 상태: DONE
## 우선순위: High
## 예상 난이도: High
## 담당: Developer F

---

## 설계 문서

`docs/02-design/features/ui-restructure.design.md` 섹션 2, 3 참조

## 현재 동작

대시보드(`/dashboard`)는 고정 레이아웃:
1. Stats Grid (6개 통계 카드)
2. Report Trend Chart (2/3) + Violation Distribution (1/3)
3. Status Pipeline (1/2) + AI Performance (1/2)
4. Top Violations Chart (full)
5. Recent Reports (1/2) + Active Campaigns (1/2)

System Status는 Settings > System Status 탭 (Owner만).

## 변경 사항

### 1. 라이브러리 설치

```bash
pnpm add react-grid-layout
pnpm add -D @types/react-grid-layout
```

### 2. DB 스키마 — user_preferences

#### `supabase/migrations/0XX_user_preferences.sql`

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

-- RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 3. Preferences API

#### `src/app/api/user/preferences/route.ts`

```typescript
// GET /api/user/preferences?key=dashboard_layout
// → { key, value: UserDashboardLayout }

// PUT /api/user/preferences
// body: { key: 'dashboard_layout', value: UserDashboardLayout }
// → upsert (INSERT ON CONFLICT UPDATE)
```

### 4. 위젯 설정

#### `src/app/(protected)/dashboard/widgets/widget-config.ts`

```typescript
export const WIDGET_CONFIGS: WidgetConfig[] = [
  {
    id: 'stats',
    title: 'Stats Overview',
    defaultLayout: { x: 0, y: 0, w: 12, h: 2, minW: 6, minH: 2 },
  },
  {
    id: 'report-trend',
    title: 'Report Trend',
    defaultLayout: { x: 0, y: 2, w: 8, h: 4, minW: 4, minH: 3 },
  },
  {
    id: 'violation-dist',
    title: 'Violation Distribution',
    defaultLayout: { x: 8, y: 2, w: 4, h: 4, minW: 4, minH: 3 },
  },
  {
    id: 'status-pipeline',
    title: 'Status Pipeline',
    defaultLayout: { x: 0, y: 6, w: 6, h: 4, minW: 4, minH: 3 },
  },
  {
    id: 'ai-performance',
    title: 'AI Performance',
    defaultLayout: { x: 6, y: 6, w: 6, h: 4, minW: 4, minH: 3 },
  },
  {
    id: 'top-violations',
    title: 'Top Violations',
    defaultLayout: { x: 0, y: 10, w: 12, h: 4, minW: 6, minH: 3 },
  },
  {
    id: 'recent-reports',
    title: 'Recent Reports',
    defaultLayout: { x: 0, y: 14, w: 6, h: 5, minW: 4, minH: 3 },
  },
  {
    id: 'active-campaigns',
    title: 'Active Campaigns',
    defaultLayout: { x: 6, y: 14, w: 6, h: 5, minW: 4, minH: 3 },
  },
  {
    id: 'system-status',
    title: 'System Status',
    minRole: 'owner',
    defaultLayout: { x: 0, y: 19, w: 12, h: 3, minW: 6, minH: 2 },
  },
]
```

### 5. 위젯 래퍼 컴포넌트

#### `src/app/(protected)/dashboard/widgets/WidgetWrapper.tsx`

```typescript
type WidgetWrapperProps = {
  title: string
  widgetId: string
  onHide: (id: string) => void
  children: React.ReactNode
}

// 구조:
// ┌─ Header ──────────────────────────┐
// │ [::] Title              [eye] [X] │
// ├──────────────────────────────────┤
// │         children                  │
// └──────────────────────────────────┘

// [::] = drag handle (className="drag-handle" for react-grid-layout)
// [eye] = 숨김 토글
// 헤더: bg-th-bg-secondary, border-b
// 본문: p-4, overflow-auto
```

### 6. 개별 위젯 분리

기존 DashboardContent.tsx에서 각 섹션을 독립 컴포넌트로 분리:

| 파일 | 기존 코드 위치 |
|------|-------------|
| `StatsWidget.tsx` | Stats Grid (6개 카드) |
| `ReportTrendWidget.tsx` | ReportTrendChart |
| `ViolationDistWidget.tsx` | ViolationDistChart |
| `StatusPipelineWidget.tsx` | StatusPipelineChart |
| `AiPerformanceWidget.tsx` | AiPerformanceCard |
| `TopViolationsWidget.tsx` | TopViolationsChart |
| `RecentReportsWidget.tsx` | Recent Reports 섹션 |
| `ActiveCampaignsWidget.tsx` | Active Campaigns 섹션 |
| `SystemStatusWidget.tsx` | 기존 SystemStatusTab 이동 |

각 위젯은:
- 자체 데이터 fetch (부모에서 받지 않음)
- 자체 로딩/에러 상태
- props: `period`, `marketplace`, `scope` (필터 공유)

### 7. 위젯 추가 패널

#### `src/app/(protected)/dashboard/widgets/AddWidgetPanel.tsx`

```typescript
// [+ Add Widget] 버튼 클릭 시 드롭다운/패널 표시
// 숨겨진 위젯 목록만 표시
// 각 항목에 [+] 버튼 → 기본 위치에 추가

type AddWidgetPanelProps = {
  hiddenWidgets: WidgetConfig[]
  onAdd: (widgetId: string) => void
}
```

### 8. DashboardContent.tsx 리팩토링

```typescript
// 핵심 로직:
// 1. 마운트 시 GET /api/user/preferences?key=dashboard_layout
// 2. 레이아웃 있으면 적용, 없으면 기본 레이아웃
// 3. react-grid-layout <ResponsiveGridLayout> 렌더링
// 4. 레이아웃 변경 시 debounce 1초 → PUT /api/user/preferences
// 5. 위젯 숨김/추가 시 즉시 저장

import { Responsive, WidthProvider } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

const ResponsiveGridLayout = WidthProvider(Responsive)

// 필터 (period, marketplace)는 상단에 유지
// 위젯들은 그리드 내에서 자유 배치

<ResponsiveGridLayout
  className="layout"
  layouts={layouts}
  breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
  cols={{ lg: 12, md: 12, sm: 6, xs: 1 }}
  rowHeight={80}
  draggableHandle=".drag-handle"
  onLayoutChange={handleLayoutChange}
  isResizable={!isMobile}
  isDraggable={!isMobile}
>
  {visibleWidgets.map(widget => (
    <div key={widget.id}>
      <WidgetWrapper title={widget.title} widgetId={widget.id} onHide={handleHide}>
        <WidgetComponent {...filterProps} />
      </WidgetWrapper>
    </div>
  ))}
</ResponsiveGridLayout>
```

### 9. 모바일 대응

- 768px 이하: `isDraggable={false}`, `isResizable={false}`
- 단일 컬럼 (cols: 1)
- 위젯 순서는 저장된 y좌표 기준
- 숨김 토글은 유지

### 10. 설정에서 System Status 제거

#### `src/app/(protected)/settings/SettingsContent.tsx`

```typescript
// BEFORE
const OWNER_TABS = ['monitoring', 'extension', 'crawler', 'sc-automation', 'auto-approve', 'templates', 'ai-learning', 'notices', 'users', 'system-status']

// AFTER (notices도 TASK-11에서 제거되므로 최종)
const OWNER_TABS = ['monitoring', 'extension', 'crawler', 'sc-automation', 'auto-approve', 'templates', 'ai-learning', 'users']
```

- SystemStatusTab import 제거
- `{activeTab === 'system-status' && ...}` 렌더링 제거
- tabLabel에서 system-status case 제거

### 11. react-grid-layout CSS 임포트

Tailwind 프로젝트에서 react-grid-layout CSS를 로드해야 함.

```typescript
// DashboardContent.tsx 또는 layout.tsx에서
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
```

또는 `src/app/globals.css`에:
```css
@import 'react-grid-layout/css/styles.css';
@import 'react-resizable/css/styles.css';
```

react-grid-layout 기본 스타일이 프로젝트 테마와 충돌하면 오버라이드 필요.

## 수정 파일

### 신규
1. `supabase/migrations/0XX_user_preferences.sql`
2. `src/app/api/user/preferences/route.ts`
3. `src/app/(protected)/dashboard/widgets/widget-config.ts`
4. `src/app/(protected)/dashboard/widgets/WidgetWrapper.tsx`
5. `src/app/(protected)/dashboard/widgets/StatsWidget.tsx`
6. `src/app/(protected)/dashboard/widgets/ReportTrendWidget.tsx`
7. `src/app/(protected)/dashboard/widgets/ViolationDistWidget.tsx`
8. `src/app/(protected)/dashboard/widgets/StatusPipelineWidget.tsx`
9. `src/app/(protected)/dashboard/widgets/AiPerformanceWidget.tsx`
10. `src/app/(protected)/dashboard/widgets/TopViolationsWidget.tsx`
11. `src/app/(protected)/dashboard/widgets/RecentReportsWidget.tsx`
12. `src/app/(protected)/dashboard/widgets/ActiveCampaignsWidget.tsx`
13. `src/app/(protected)/dashboard/widgets/SystemStatusWidget.tsx`
14. `src/app/(protected)/dashboard/widgets/AddWidgetPanel.tsx`

### 수정
15. `src/app/(protected)/dashboard/DashboardContent.tsx` — 위젯 그리드 시스템으로 리팩토링
16. `src/app/(protected)/settings/SettingsContent.tsx` — system-status 탭 제거
17. `package.json` — react-grid-layout 의존성 추가

## 테스트

- [ ] 대시보드 로드 시 기본 레이아웃 표시
- [ ] 위젯 드래그 이동 정상
- [ ] 위젯 리사이즈 정상
- [ ] 위젯 숨김 토글 (눈 아이콘) 정상
- [ ] 숨긴 위젯 [+ Add Widget]으로 복원
- [ ] 레이아웃 변경 후 페이지 새로고침 → 저장된 레이아웃 유지
- [ ] System Status 위젯 Owner만 표시
- [ ] 설정에서 System Status 탭 사라짐
- [ ] 모바일: 단일 컬럼, 드래그/리사이즈 비활성
- [ ] 다크 모드 대응
- [ ] 필터 (period, marketplace) 변경 시 모든 위젯 반영
- [ ] 새 사용자 첫 접속 시 기본 레이아웃 정상
