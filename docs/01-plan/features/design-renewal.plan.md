# Design Renewal Plan — Sentinel UI Modernization

## Overview
20~30대 사용자를 위한 Sentinel 전체 UI/UX 모던화. 현재 "올드"한 느낌을 제거하고 젊고 세련된 디자인으로 개선.

## Current Problems (스크린샷 분석)

### 1. 색감 (Color)
- 라이트 테마: Warm Cream (#FAF3E1) — 따뜻하지만 올드한 느낌
- 다크 테마: 무난하지만 개성 없음
- 액센트 컬러 (#FF6D1F 오렌지) — Spigen 브랜드와 맞지만 단조로움

### 2. 타이포그래피
- 전체적으로 text-sm 위주 → 작고 답답한 느낌
- 숫자/통계 강조 부족
- 제목 크기 위계 약함

### 3. 컴포넌트
- 체크박스 → 토글(Switch)로 교체 필요
- Card: 기본 border만, 깊이감 없음
- Button: 기본 rounded-lg, 현대적 pill shape 옵션 없음
- Input/Select: 기본적인 border 스타일

### 4. 레이아웃/그리드
- Dashboard stat cards: 균일하지만 밋밋
- 테이블: 밀집도 높고 여백 부족
- 일부 그리드 정렬 불일치

### 5. 로그인 페이지
- 중앙 카드 하나 — OMS 스크린샷(일러스트 split layout)에 비해 단조

### 6. 대시보드
- stat cards가 작고 flat
- 차트 영역에 시각적 구분 부족

## Modernization Strategy

### Phase 1: Design System Foundation (CSS Variables + Components)
1. **색상 팔레트 업그레이드**
   - 라이트: Warm Cream → Clean White/Cool Gray 기반
   - 다크: 더 깊은 대비, subtle gradient 배경
   - 액센트: 그라데이션 변형 추가 (Orange → Coral gradient)
   - Status 색상: 더 vivid하게

2. **Toggle (Switch) 컴포넌트 신규 생성**
   - `src/components/ui/Toggle.tsx`
   - Settings의 모든 checkbox → toggle 교체

3. **Card 컴포넌트 업그레이드**
   - Hover시 shadow 강화
   - 선택적 gradient border 옵션
   - hover lift effect

4. **Button 업그레이드**
   - Gradient variant 추가
   - hover scale micro-interaction

5. **Input/Select 업그레이드**
   - 더 큰 padding
   - focus 시 glow effect

### Phase 2: Page-Level Redesign

6. **로그인 페이지 리디자인**
   - Split layout (좌: 브랜드 비주얼, 우: 로그인 폼)
   - 좌측에 gradient + 아이콘/일러스트
   - "Sign in with Google" 버튼 더 크고 눈에 띄게

7. **Dashboard 개선**
   - Stat cards: gradient 배경 + 큰 숫자 + 아이콘 강화
   - Chart cards: 더 둥근 모서리, 내부 padding 증가
   - Greeting 섹션 강화

8. **테이블 개선**
   - 행 높이 증가 (py-3 → py-4)
   - 체크박스 → 행 선택은 클릭으로
   - 더 부드러운 hover effect
   - 헤더: 더 작은 대문자 대신 일반 케이스

9. **Settings 페이지 개선**
   - 탭 디자인: 밑줄 탭 → pill/segment 탭
   - 체크박스 전체 토글로 교체

### Phase 3: Polish & Grid Alignment

10. **그리드/레이아웃 정렬**
    - Dashboard 차트 높이 통일
    - 카드 간 gap 일관성 (gap-4 → gap-6 통일)
    - 반응형 breakpoint 정리

11. **Sidebar 미세 조정**
    - Active state: 좌측 accent bar 추가
    - 아이콘 크기 살짝 증가 (h-5 w-5 → h-5 w-5 유지, padding 조정)

12. **Micro-interactions**
    - 페이지 전환 시 fade-in
    - 카드 hover lift
    - 버튼 press scale

## Implementation Order
1. globals.css 색상 팔레트 업데이트 (Foundation)
2. Toggle.tsx 신규 생성
3. Card/Button/Input 컴포넌트 업그레이드
4. Login 페이지 리디자인
5. Dashboard 개선
6. 테이블/Settings 개선
7. 그리드 정렬 + Micro-interactions

## Scope
- **변경 파일 수**: ~15-20개
- **신규 파일**: 1개 (Toggle.tsx)
- **Breaking Changes**: 없음 (CSS variable 기반이라 점진적 적용)

## Risk
- Spigen 브랜드 가이드라인과 충돌 가능 → 오렌지 액센트는 유지
- 기존 페이지 레이아웃 깨짐 → 단계적 적용으로 최소화
