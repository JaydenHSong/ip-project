# TASK-11: Notices 독립 페이지 + 설정에서 분리

## 상태: DONE
## 우선순위: Medium
## 예상 난이도: Medium
## 담당: Developer E

---

## 설계 문서

`docs/02-design/features/ui-restructure.design.md` 섹션 1 참조

## 현재 동작

- Notices 관리: `/settings` > Notices 탭 (Admin/Owner만)
- Notices 열람: 헤더 우측 NoticeDropdown (모든 역할, 최근 5개)
- API: `GET/POST /api/changelog`

## 변경 사항

### 1. /notices 페이지 생성

#### `src/app/(protected)/notices/page.tsx` (서버 컴포넌트)

```typescript
// 역할 체크 후 NoticesContent 렌더링
// props: userRole, userId
```

#### `src/app/(protected)/notices/NoticesContent.tsx` (클라이언트)

기존 `NoticesTab.tsx`를 확장:
- 모든 역할이 접근 가능 (읽기)
- Admin/Owner만 생성/수정/삭제 버튼 표시
- 카테고리 필터 탭 (All | Update | Policy | Notice | System)
- 카드 형태 리스트 (현재 divide-y → 카드로 개선)

**레이아웃:**
```
┌─────────────────────────────────────────────┐
│ Notices                    [+ New Notice]   │
├─────────────────────────────────────────────┤
│ All | Update | Fix | Policy | AI            │
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐ │
│ │ [Update] Extension v1.4.0 Released      │ │
│ │ New SC form filler, i18n support...     │ │
│ │ System - 2h ago              [Edit][Del]│ │
│ └─────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────┐ │
│ │ [Policy] V10 Variation 기준 변경         │ │
│ │ ...                                     │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

**생성/수정**: 모달 다이얼로그 (기존 인라인 폼 → 모달로 변환)

**삭제**: 확인 모달 후 `DELETE /api/changelog/[id]`

### 2. 사이드바에 Notices 메뉴 추가

#### `src/components/layout/Sidebar.tsx`

메뉴 아이템 추가 (Patents 아래):
```typescript
{ label: 'Notices', href: '/notices', icon: MegaphoneIcon }
// minRole 없음 — 모든 역할 표시
```

위치:
```
Dashboard
Campaigns
Report Queue
Completed Reports
Patents
Notices          <- 여기
─────────────
Settings
```

### 3. 설정에서 Notices 탭 제거

#### `src/app/(protected)/settings/SettingsContent.tsx`

```typescript
// BEFORE
const ADMIN_TABS = ['monitoring', 'extension', 'crawler', 'sc-automation', 'auto-approve', 'templates', 'ai-learning', 'notices']
const OWNER_TABS = ['monitoring', 'extension', 'crawler', 'sc-automation', 'auto-approve', 'templates', 'ai-learning', 'notices', 'users', 'system-status']

// AFTER
const ADMIN_TABS = ['monitoring', 'extension', 'crawler', 'sc-automation', 'auto-approve', 'templates', 'ai-learning']
const OWNER_TABS = ['monitoring', 'extension', 'crawler', 'sc-automation', 'auto-approve', 'templates', 'ai-learning', 'users', 'system-status']
```

- NoticesTab import 제거
- `{activeTab === 'notices' && ...}` 렌더링 제거
- tabLabel에서 notices case 제거

### 4. API 확장 (필요시)

현재 API가 `/api/changelog`인데, 이름을 `/api/notices`로 변경하거나 별칭 추가.

삭제 API가 없으면 추가:
```
DELETE /api/notices/[id]  — Admin/Owner만
PUT /api/notices/[id]     — Admin/Owner만 (수정)
```

### 5. 헤더 드롭다운 유지

`NoticeDropdown.tsx`는 변경 없음. "View All" 링크만 `/notices`로 연결 확인.

## 수정 파일

1. `src/app/(protected)/notices/page.tsx` — 신규
2. `src/app/(protected)/notices/NoticesContent.tsx` — 신규 (NoticesTab 기반)
3. `src/components/layout/Sidebar.tsx` — Notices 메뉴 추가
4. `src/app/(protected)/settings/SettingsContent.tsx` — notices 탭 제거
5. `src/components/layout/NoticeDropdown.tsx` — "View All" 링크 확인
6. `src/app/api/notices/[id]/route.ts` — DELETE/PUT 추가 (없으면)

## 테스트

- [ ] /notices 페이지 접근 — 모든 역할 가능
- [ ] Admin/Owner: 생성/수정/삭제 버튼 표시
- [ ] Editor/Viewer: 읽기 전용 (생성 버튼 없음)
- [ ] 카테고리 필터 동작
- [ ] 사이드바에 Notices 메뉴 표시
- [ ] 설정에서 Notices 탭 사라짐
- [ ] 헤더 드롭다운 "View All" → /notices 이동
- [ ] 모바일 반응형
