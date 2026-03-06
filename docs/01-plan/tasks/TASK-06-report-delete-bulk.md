# TASK-06: 리포트 삭제 권한 + 벌크 삭제

## 상태: DONE
## 우선순위: High
## 예상 난이도: Medium
## 담당: Developer B

---

## 현재 동작

- 리포트 삭제 기능: **없음** (API도, UI도 없음)
- 벌크 작업: 체크박스 선택 → 일괄 Approve만 존재 (pending_review 상태만)

## 변경 사항

### 1. 권한 모델

| 역할 | 삭제 가능 상태 |
|------|--------------|
| Admin (owner) | 모든 상태 |
| Editor | draft, pending_review (본인이 만든 것만) |
| Viewer | X |

### 2. API 구현

#### 단건 삭제: `DELETE /api/reports/[id]`

```typescript
// 권한 체크
// Admin: 무조건 삭제 가능
// Editor: created_by === 본인 AND status IN ('draft', 'pending_review')
// Viewer: 403

// 삭제 방식: soft delete 권장 (status → 'deleted' 또는 deleted_at 설정)
// 또는 hard delete (CASCADE 주의)
```

#### 벌크 삭제: `DELETE /api/reports/bulk-delete`

```typescript
// Request body: { report_ids: string[] }
// 각 건별 권한 체크 후 삭제
// 응답: { deleted: number, failed: number, errors: [{id, reason}] }
```

### 3. UI 구현

#### 리포트 상세 페이지 (`ReportActions.tsx`)
- "Delete" 버튼 추가 (빨간색, 우측 하단 또는 드롭다운 메뉴)
- 확인 모달: "이 신고를 삭제하시겠습니까?"
- Admin/Editor 권한일 때만 표시

#### 리포트 목록 페이지 (`ReportsContent.tsx`)
- 기존 체크박스 선택 기능 활용
- 선택된 항목이 있을 때 "Delete Selected" 버튼 표시
- 확인 모달: "선택한 N건을 삭제하시겠습니까?"
- Admin 권한일 때만 벌크 삭제 표시

### 4. DB 변경 (soft delete 시)

```sql
-- reports 테이블에 deleted_at 추가 (선택)
ALTER TABLE reports ADD COLUMN deleted_at TIMESTAMPTZ NULL;
ALTER TABLE reports ADD COLUMN deleted_by UUID NULL REFERENCES users(id);

-- 또는 기존 status에 'deleted' 추가
-- CHECK constraint 수정 필요
```

## 수정 파일

1. `src/app/api/reports/[id]/route.ts` — DELETE 핸들러 추가
2. `src/app/api/reports/bulk-delete/route.ts` — 신규 생성
3. `src/app/(protected)/reports/[id]/ReportActions.tsx` — 삭제 버튼
4. `src/app/(protected)/reports/ReportsContent.tsx` — 벌크 삭제 버튼
5. DB 마이그레이션 (soft delete 시)

## 테스트

- [ ] Admin: 모든 리포트 삭제 가능
- [ ] Editor: 본인 draft/pending_review만 삭제 가능
- [ ] Viewer: 삭제 버튼 안 보임
- [ ] 벌크 삭제: 여러 건 선택 후 일괄 삭제
- [ ] 삭제 후 목록에서 사라짐
- [ ] 삭제 확인 모달 동작
