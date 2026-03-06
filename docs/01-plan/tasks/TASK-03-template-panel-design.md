# TASK-03: Apply Template 사이드 패널 디자인 완성

## 상태: TODO
## 우선순위: Medium
## 예상 난이도: Medium
## 담당: Developer A

---

## 현재 동작

리포트 상세 페이지(`/reports/[id]`)에서:
- draft 상태 + 빈 body → 상단 배너로 "Apply Template" 자동 제안
- "Apply Template" 버튼 클릭 → TemplatePanel(슬라이드 패널) 열림

**사용자 피드백**: 사이드 창 디자인이 미완성

## 변경 사항

TemplatePanel UI를 완성도 있게 디자인.

### 디자인 요구 사항

1. **패널 헤더**
   - 제목: "Select Template"
   - 닫기(X) 버튼
   - 현재 위반 유형 표시 (해당 유형 템플릿 우선 표시)

2. **템플릿 목록**
   - 카드 형태로 나열
   - 각 카드: 템플릿 이름, 위반 유형 배지, 본문 미리보기 (3줄 truncate)
   - 현재 위반 유형과 일치하는 템플릿 상단 고정 + 하이라이트
   - 호버 시 전체 미리보기 확장 또는 툴팁

3. **적용 동작**
   - "Use This Template" 버튼 클릭 → draft_body에 반영
   - 템플릿 변수({{ASIN}}, {{SELLER}} 등) 자동 치환 미리보기

4. **빈 상태**
   - 해당 위반 유형에 템플릿이 없을 때 안내 메시지

## 수정 파일

1. `src/app/(protected)/reports/[id]/ReportDetailContent.tsx` — TemplatePanel 관련 부분
2. TemplatePanel 컴포넌트 파일 (위치 확인 필요)

## 참고

- 템플릿 변수 목록: `src/types/templates.ts`
  - {{ASIN}}, {{TITLE}}, {{SELLER}}, {{BRAND}}, {{MARKETPLACE}}, {{PRICE}}, {{VIOLATION_TYPE}}, {{TODAY}}, {{RATING}}, {{REVIEW_COUNT}}

## 테스트

- [ ] 패널 열고 닫기
- [ ] 템플릿 선택 시 draft_body 반영
- [ ] 변수 자동 치환 확인
- [ ] 빈 상태 메시지 표시
- [ ] 모바일 반응형
