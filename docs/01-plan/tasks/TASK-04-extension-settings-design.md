# TASK-04: 설정 익스텐션 페이지 디자인 개선

## 상태: TODO
## 우선순위: Low
## 예상 난이도: Medium
## 담당: Developer A

---

## 현재 동작

`/settings` 페이지의 익스텐션 탭 (ExtensionGuide.tsx):
- Card 컴포넌트 기반 레이아웃
- 4단계 위저드 (다운로드 -> 압축해제 -> Chrome 로드 -> 검증)
- Step indicator: 원형 버튼 + 진행률 바
- 섹션: Web Store, Manual Install, Background Fetch, Extension Info, Version History

**참고**: 다운로드 버전 수정 건은 별도 해결 완료

**사용자 피드백**: 전체적으로 디자인이 안 된 느낌

## 변경 사항

### 디자인 개선

**레이아웃 방향**:
- 현재 위저드 + 텍스트 나열 -> 더 구조화된 카드 + 아이콘 기반 UI
- 각 단계에 일러스트/아이콘 추가
- 간격, 타이포그래피, 색상 일관성 확보

**참고 디자인 요소**:
- Step indicator를 좀 더 modern하게 (Stepper 컴포넌트)
- 다운로드 버튼 강조 (primary 색상, 큰 버튼)
- Version History 섹션을 깔끔한 타임라인 형태로

## 수정 파일

1. `src/app/(protected)/settings/ExtensionGuide.tsx` — 메인 수정

## 테스트

- [ ] 위저드 단계별 이동 정상
- [ ] 모바일 반응형
- [ ] 다크 모드 대응
