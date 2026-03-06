# TASK-02: 모든 뒤로가기 버튼 가시성 개선

## 상태: TODO
## 우선순위: Medium
## 예상 난이도: Low
## 담당: Developer A

---

## 현재 동작

뒤로가기 버튼이 존재하는 페이지:
- `/reports/[id]` (ReportDetailContent.tsx) — SVG 화살표, `text-th-text-muted` 스타일
- `/reports/new` (NewReportForm.tsx) — SVG 화살표, 임베드 모드 아닐 때만 표시

**사용자 피드백**: 뒤로가기 버튼이 눈에 안 띄고 직관적이지 않음

## 변경 사항

프로젝트 전체에서 뒤로가기 버튼을 통일된 스타일로 개선.

### 디자인 가이드

1. **크기**: 최소 36x36px 터치 영역
2. **스타일**:
   - 배경: `bg-th-bg-secondary` (반투명 배경으로 눈에 띄게)
   - 텍스트: `text-th-text-primary` (muted가 아닌 primary)
   - 호버: `hover:bg-th-bg-tertiary`
   - 라운드: `rounded-lg`
3. **위치**: 페이지 제목 왼쪽, 수직 중앙 정렬
4. **아이콘**: 현재 SVG 유지하되 크기 20x20 → 24x24
5. **레이블**: 아이콘 옆에 "Back" 또는 "목록으로" 텍스트 추가 (선택)

### 공통 컴포넌트 생성 권장

```
src/components/ui/BackButton.tsx
```

Props: `href?: string`, `label?: string`, `onClick?: () => void`

## 수정 파일

1. `src/components/ui/BackButton.tsx` — 신규 생성
2. `src/app/(protected)/reports/[id]/ReportDetailContent.tsx` — BackButton 사용
3. `src/app/(protected)/reports/new/NewReportForm.tsx` — BackButton 사용
4. 기타 뒤로가기 버튼이 있는 모든 페이지 검색 후 적용

## 검색 방법

```bash
grep -r "router.back\|뒤로\|Back\|← " src/app/ --include="*.tsx"
```

## 테스트

- [ ] 모든 뒤로가기 버튼이 동일 스타일
- [ ] 클릭 시 이전 페이지로 이동
- [ ] 모바일에서 터치 영역 충분
- [ ] 다크 모드 대응
