# TASK-01: 리포트 큐 ASIN 클릭 시 바로 디테일 이동

## 상태: TODO
## 우선순위: Medium
## 예상 난이도: Low
## 담당: Developer A

---

## 현재 동작

리포트 목록(`/reports`)에서 ASIN 클릭 시:
1. 오른쪽에 SlidePanel(사이드패널)이 열림
2. 패널 안에서 "상세" 링크를 다시 클릭해야 `/reports/[id]`로 이동

**사용자 피드백**: 중간 단계(사이드패널)가 불필요한 extra step

## 변경 사항

ASIN(또는 리포트 행) 클릭 시 `/reports/[id]`로 바로 라우팅되도록 변경.

## 수정 파일

### `src/app/(protected)/reports/ReportsContent.tsx`

1. **사이드패널 제거 또는 축소**
   - `setPreviewReportId(report.id)` 호출하는 onClick → `router.push(/reports/${report.id})` 로 변경
   - SlidePanel 컴포넌트 import 및 렌더링 제거
   - `previewReportId` state 제거

2. **행 클릭 동작**
   - 테이블 행 전체를 클릭 가능하게 (cursor-pointer)
   - 행 클릭 → `/reports/${report.id}`로 이동

## 주의 사항

- bulk 체크박스 선택과 행 클릭이 충돌하지 않도록 주의 (체크박스 영역 클릭 시 선택, 나머지 영역 클릭 시 이동)
- 모바일에서도 동작 확인

## 테스트

- [ ] 리포트 목록에서 행 클릭 시 상세 페이지로 이동
- [ ] 체크박스 클릭 시 행 선택 (페이지 이동 X)
- [ ] 뒤로가기 시 리포트 목록으로 복귀
- [ ] 모바일 동작 확인
