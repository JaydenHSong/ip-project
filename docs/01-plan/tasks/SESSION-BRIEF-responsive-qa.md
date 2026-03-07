# Session Brief: Responsive QA - Full Breakpoint Inspection

## Status: DONE
## Assigned Session: 2026-03-06
## Completed At: 2026-03-06

---

## Goal
모든 페이지를 Phone / Tablet / Desktop 3개 뷰포트에서 검사하여, 요소가 가려지거나 잘리거나 깨지는 문제를 찾아 수정.

## Priority: HIGH (Mobile UI 개선 세션 완료 후 실행)

---

## Inspection Viewports

| Name | Width | Device Example |
|------|-------|---------------|
| Phone S | 375px | iPhone SE |
| Phone L | 430px | iPhone 15 Pro Max |
| Tablet | 768px | iPad Mini |
| Tablet L | 1024px | iPad Pro |
| Desktop | 1280px | 일반 모니터 |
| Desktop L | 1920px | FHD 모니터 |

---

## Inspection Pages (All Routes)

### Phase 1: Core Pages
1. `/dashboard` — 대시보드 (위젯 그리드, 필터, 기간 선택)
2. `/reports` — 리포트 큐 (테이블, 벌크 액션, 필터 바)
3. `/reports/new` — 신규 리포트 작성 (폼, ASIN 입력, 스크린샷)
4. `/reports/[id]` — 리포트 상세 (리스팅 정보, 드래프트, 액션 버튼)
5. `/reports/completed` — 완료 리포트 목록

### Phase 2: Sub Pages
6. `/campaigns` — 캠페인 목록
7. `/campaigns/new` — 캠페인 생성 폼
8. `/campaigns/[id]` — 캠페인 상세
9. `/patents` — 특허 레지스트리
10. `/notices` — 공지사항
11. `/settings` — 설정 (탭: General, Users, Extensions, Violations)

### Phase 3: Components
12. Modal 컴포넌트 (삭제 확인, 위젯 추가 등)
13. SlidePanel 컴포넌트 (템플릿 선택 등)
14. Dropdown 메뉴 (More 메뉴, 필터 드롭다운)
15. Toast 알림 (있는 경우)

---

## Checklist per Page

각 페이지마다 아래 항목 체크:

### Layout
- [ ] 컨텐츠가 화면 밖으로 overflow 되지 않는지 (`overflow-x` 발생 여부)
- [ ] 가로 스크롤바가 뜨지 않는지
- [ ] 헤더/타이틀이 잘리거나 두 줄 이상으로 깨지지 않는지
- [ ] 버튼/액션 영역이 가려지지 않는지
- [ ] 하단 탭바에 컨텐츠가 가려지지 않는지 (모바일)

### Typography
- [ ] 텍스트가 컨테이너를 넘어 튀어나가지 않는지
- [ ] 긴 텍스트 (ASIN, URL, 이메일 등)에 `truncate` 또는 `break-all` 적용
- [ ] 폰트 크기가 뷰포트에 적절한지 (모바일에서 너무 크거나 작지 않은지)

### Interactive Elements
- [ ] 버튼/링크의 터치 타겟이 최소 44x44px (모바일)
- [ ] 드롭다운/모달이 화면 안에서 열리는지 (밖으로 넘어가지 않는지)
- [ ] 키보드가 올라왔을 때 입력 필드가 가려지지 않는지

### Tables
- [ ] 테이블이 모바일에서 카드 뷰로 전환되는지
- [ ] 또는 가로 스크롤 가능한 컨테이너 안에 있는지
- [ ] 체크박스 열이 다른 열에 가려지지 않는지

### Dark Mode
- [ ] 모든 요소가 다크 모드에서 읽을 수 있는지
- [ ] 배경과 텍스트 대비가 충분한지
- [ ] 보더/구분선이 보이는지

---

## Inspection Method

### 방법 1: Chrome DevTools (권장)
```
1. 사이트 접속 (로컬 또는 Preview URL)
2. F12 -> Device Toolbar 켜기 (Ctrl+Shift+M)
3. 각 뷰포트 크기로 변경하며 확인
4. Responsive 모드에서 드래그로 크기 조절하며 "깨지는 지점" 찾기
```

### 방법 2: 코드 레벨 검사
```
1. 각 페이지 컴포넌트 파일 열기
2. Tailwind 반응형 클래스 확인 (sm:, md:, lg:, xl:)
3. flex/grid 레이아웃에서 overflow 처리 확인
4. 고정 width/height 값이 뷰포트보다 클 가능성 확인
```

### 방법 3: 자동화 (Playwright)
```typescript
const viewports = [
  { name: 'phone-s', width: 375, height: 812 },
  { name: 'phone-l', width: 430, height: 932 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'tablet-l', width: 1024, height: 1366 },
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'desktop-l', width: 1920, height: 1080 },
]

// 각 뷰포트에서 각 페이지 스크린샷 캡처
for (const vp of viewports) {
  await page.setViewportSize({ width: vp.width, height: vp.height })
  for (const route of routes) {
    await page.goto(route)
    await page.screenshot({
      path: `screenshots/${vp.name}_${route.replace(/\//g, '_')}.png`,
      fullPage: true
    })
  }
}
```

---

## Common Issues & Fix Patterns

### Issue 1: 가로 overflow
```tsx
// Bad
<div className="flex gap-4">
  <div className="w-[500px]">...</div>
</div>

// Fix: min-w-0 추가 or max-w-full
<div className="flex gap-4">
  <div className="min-w-0 max-w-full">...</div>
</div>
```

### Issue 2: 테이블 모바일 깨짐
```tsx
// Fix: overflow-x-auto 래퍼
<div className="overflow-x-auto -mx-4 px-4">
  <table className="min-w-[600px] w-full">...</table>
</div>
```

### Issue 3: 필터 바 줄바꿈
```tsx
// Fix: flex-wrap + 모바일에서 full width
<div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
  <select className="w-full sm:w-auto">...</select>
  <input className="w-full sm:w-auto" />
</div>
```

### Issue 4: 모달 가장자리 잘림
```tsx
// Fix: 모바일에서 full-width에 가깝게
<div className="w-[calc(100vw-2rem)] max-w-md sm:w-full">
  ...
</div>
```

### Issue 5: 긴 ASIN/URL 텍스트 overflow
```tsx
// Fix
<span className="truncate max-w-[200px] sm:max-w-none">
  {longText}
</span>
```

---

## Output Format

검사 결과를 아래 형식으로 기록:

```markdown
## [Page Name] - [Viewport]

| # | Issue | Severity | Location | Fix |
|---|-------|----------|----------|-----|
| 1 | 필터 바 두 줄 줄바꿈 | Medium | ReportsContent.tsx:234 | flex-col on mobile |
| 2 | ASIN 텍스트 overflow | Low | :350 | truncate 추가 |
```

Severity 기준:
- **Critical**: 요소가 완전히 가려지거나 클릭 불가
- **Medium**: 레이아웃 깨짐, 스크롤바 발생, 두 줄 줄바꿈
- **Low**: 미관상 개선 필요 (여백 불균형, 정렬 미세 조정)

---

## Validation

모든 수정 후:
1. `pnpm typecheck` PASS
2. `pnpm lint` 신규 에러 없음
3. 6개 뷰포트에서 재검사 -> 이슈 0건 확인
4. Light/Dark 모드 모두 확인
