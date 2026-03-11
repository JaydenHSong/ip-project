# BR Case URL & Case ID 관리 개선 — Design

> **Feature**: BR 케이스 ID 링크화 + 추출 버그 수정 + 목록 표시 + CaseThread 새로고침
> **Plan**: [br-case-url.plan.md](../../01-plan/features/br-case-url.plan.md)
> **Created**: 2026-03-11
> **Phase**: Completed

---

## 1. Implementation Items

| # | Item | Files | Description |
|---|------|-------|-------------|
| D1 | Case ID 추출 버그 수정 | `crawler/src/br-submit/worker.ts` | `'submitted'` → `null` 반환 |
| D2 | Case ID → BR 대시보드 링크 | `ReportDetailContent.tsx` | 클릭 가능 링크, 새 탭 |
| D3 | Reports 목록 Case ID 표시 | `ReportsContent.tsx` | 데스크톱 테이블 + 모바일 카드 |
| D4 | CaseThread Refresh 버튼 | `CaseThread.tsx` | 수동 새로고침 버튼 |

---

## 2. Detailed Design

### D1: Case ID 추출 버그 수정

**File**: `crawler/src/br-submit/worker.ts:340`

**Before**:
```typescript
if (body.includes('Thank you') || body.includes('submitted')) return 'submitted'
```

**After**:
```typescript
if (body.includes('Thank you') || body.includes('submitted')) return null
```

**영향**: `br_case_id`가 `null`이면 기존 모니터링 워커의 `br_case_id IS NOT NULL` 필터에 의해 모니터링 대상에서 자연스럽게 제외. 별도 상태 추가 불필요.

---

### D2: Case ID → BR 대시보드 링크

**File**: `src/app/(protected)/reports/[id]/ReportDetailContent.tsx:631`

**BR Dashboard URL 패턴**:
```
https://brandregistry.amazon.com/cu/case-dashboard/view-case?caseID={br_case_id}
```

**조건 분기**:
| 조건 | 렌더링 |
|------|--------|
| `br_case_id`가 숫자 ID | `<a>` 링크 (accent 색상, hover underline, target="_blank") |
| `br_case_id === 'submitted'` | `<span>` plain text (기존 레코드 호환) |
| `br_case_id === null` | "Submitted (ID pending)" 텍스트 |

---

### D3: Reports 목록 Case ID 표시

**File**: `src/app/(protected)/reports/ReportsContent.tsx`

**데스크톱 테이블**: Status 컬럼 아래에 `BR#{case_id}` 링크 (font-mono, 10px, accent 색상)
- 별도 컬럼 추가 없이 Status 셀 내부에 flex-col로 배치
- `stopPropagation`으로 행 클릭(프리뷰)과 분리

**모바일 카드**: 하단 메타 영역에 BR#{case_id} 링크 추가 (BR status badge 옆)

**필터 조건**: `br_case_id && br_case_id !== 'submitted'` — 유효한 ID만 표시

---

### D4: CaseThread Refresh 버튼

**File**: `src/components/features/case-thread/CaseThread.tsx`

**State 추가**:
```typescript
const [refreshing, setRefreshing] = useState(false)
```

**버튼 위치**: 스레드 아이템 목록 위, 우측 정렬

**표시 조건**: `brCaseStatus !== 'closed'`

**UI 사양**:
- 회전 화살표 아이콘 (SVG inline)
- refreshing 중: 아이콘 `animate-spin` + "Refreshing..." 텍스트 + disabled
- 완료: "Refresh" 텍스트
- 스타일: ghost 버튼 (text-th-text-secondary, hover:bg-th-bg-hover)

---

## 3. 실행 순서

1. D1 (버그) → D2 (UX) → D3 (목록) → D4 (새로고침)
2. `pnpm typecheck && pnpm build` 검증

## 4. DB 변경

없음. 기존 스키마 그대로 사용.
