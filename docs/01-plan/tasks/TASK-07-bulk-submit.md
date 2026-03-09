# TASK-07: 벌크 Submit 기능

## 상태: DONE
## 우선순위: High
## 예상 난이도: Medium
## 담당: Developer B

---

## 현재 동작

- 벌크 Approve: 있음 (체크박스 → 일괄 승인, pending_review 상태만)
- 벌크 Submit: **없음**
- 단건 Submit: ReportActions.tsx에서 "Submit for Review" 버튼 (draft → pending_review 또는 PD Reporting)

## 변경 사항

### 1. 벌크 Submit 대상 상태

| 현재 상태 | Submit 동작 | 결과 상태 |
|----------|-----------|----------|
| draft | Submit for Review | pending_review |
| approved | PD Report | sc_submitting (PD Reporting) |

### 2. API 구현

#### `POST /api/reports/bulk-submit`

```typescript
type BulkSubmitRequest = {
  report_ids: string[]
  action: 'submit_review' | 'submit_sc'  // Review 제출 vs PD Reporting
}

type BulkSubmitResponse = {
  submitted: number
  failed: number
  errors: { id: string; reason: string }[]
}

// 권한: Editor 이상
// submit_review: draft → pending_review
// submit_sc: approved → sc_submitting (PD Reporting 트리거)
```

### 3. UI 구현

#### `src/app/(protected)/reports/ReportsContent.tsx`

- 기존 체크박스 선택 활용 (TASK-06 벌크 삭제와 동일 선택 메커니즘)
- 선택된 항목 상태에 따라 버튼 표시:
  - draft 선택 → "Submit for Review (N)" 버튼
  - approved 선택 → "Submit to SC (N)" 버튼
  - 혼합 선택 → 상태별 건수 표시 후 각각 처리

- **벌크 액션 바**: 체크박스 선택 시 하단 고정 바 또는 상단에 액션 바 표시

```
┌─────────────────────────────────────────────────────┐
│ 3 selected  │ Submit Review │ Submit SC │ Delete │ X │
└─────────────────────────────────────────────────────┘
```

### 4. TASK-06과의 관계

- 같은 체크박스 선택 UI를 공유
- 벌크 액션 바에 Delete + Submit 버튼 함께 배치
- **TASK-06과 동시 구현 권장** (같은 Developer B)

## 수정 파일

1. `src/app/api/reports/bulk-submit/route.ts` — 신규 생성
2. `src/app/(protected)/reports/ReportsContent.tsx` — 벌크 액션 바 + Submit 버튼
3. TASK-06에서 만드는 벌크 삭제 UI와 통합

## 주의 사항

- SC 벌크 제출 시 Rate Limiting 고려 (SC 자동화 부하)
- 진행 상태 표시 (프로그레스 바 또는 토스트)
- 부분 실패 시 결과 리포트 표시

## 테스트

- [ ] draft 여러 건 선택 → 일괄 Submit for Review
- [ ] approved 여러 건 선택 → 일괄 Submit to SC
- [ ] 혼합 선택 시 적절한 버튼 표시
- [ ] 부분 실패 시 에러 표시
- [ ] 처리 완료 후 목록 새로고침
