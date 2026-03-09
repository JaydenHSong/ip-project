# SESSION-BRIEF: BRCM Unit F — SLA 시스템

## Status: DONE
## Assigned Session: 2026-03-08
## Completed At: 2026-03-08

---

## 개요

R02(SLA 카운트다운 뱃지) 구현.
케이스별 긴급도를 시각적으로 표현하여 우선순위 판단 지원.

## 예상 시간: 3.5시간

## 의존성: Unit A (DB — br_sla_configs, br_sla_deadline_at)

---

## 작업 목록

### 1. SLA 계산 로직

#### `src/lib/br-case/sla.ts`
```typescript
type SlaStatus = 'on_track' | 'warning' | 'breached' | 'paused'

calculateSlaDeadline(violationCategory, startTime, config) → Date
getSlaStatus(deadline, isPaused) → { status: SlaStatus, remainingMs: number }
formatSlaCountdown(remainingMs) → string  // "2d 5h" / "3h 20m" / "Overdue 1d"
```

### 2. API

- `GET /api/settings/sla` — SLA 설정 조회 (admin)
- `PATCH /api/settings/sla` — SLA 설정 수정 (admin only)

### 3. UI

#### SlaBadge 컴포넌트
- `src/components/ui/SlaBadge.tsx`
- Props: `deadline: string | null`, `paused: boolean`
- 초록 (>24h) → 노랑 (<24h) → 빨강 (초과)
- 회색 (paused — 아마존 대기 중)
- 실시간 카운트다운 (useEffect, 1분마다)

#### Reports 리스트
- SLA 컬럼 추가 (SlaBadge)
- SLA 기준 정렬 옵션

#### Report Detail
- BR 케이스 정보 영역에 SLA 타이머 표시

#### Settings 페이지
- Settings > SLA 탭 추가
- 위반 카테고리별 예상 응답 시간/경고 기준 편집

### 4. 모니터링 연동

- Unit B(Monitor Worker)에서 상태 변경 시 SLA deadline 재계산 훅 추가
- 아마존 응답 시 → paused
- Action Required → restart (새 deadline)

---

## 완료 기준

- [ ] SlaBadge가 초록/노랑/빨강/회색 정확히 표시
- [ ] 실시간 카운트다운 동작
- [ ] Settings에서 SLA 설정 수정 가능
- [ ] Reports 리스트에서 SLA 기준 정렬
- [ ] `pnpm typecheck && pnpm lint` 통과

## 변경 파일 목록 (완료 후 기록)

### 신규 파일
- `src/components/ui/SlaBadge.tsx` — SLA 카운트다운 뱃지 (초록/노랑/빨강/회색, 1분 갱신)
- `src/app/api/settings/sla/route.ts` — SLA 설정 조회(GET) + 수정(PATCH) API
- `src/app/(protected)/settings/SlaSettings.tsx` — Settings SLA 탭 UI

### 수정 파일
- `src/app/(protected)/settings/SettingsContent.tsx` — SLA 탭 추가 (Timer 아이콘, nav, content)
- `src/app/(protected)/reports/ReportsContent.tsx` — SLA 컬럼 + SlaBadge + 정렬 옵션 추가
- `src/app/(protected)/reports/page.tsx` — sla_warning smart_queue 필터 추가
- `src/app/(protected)/reports/[id]/page.tsx` — ReportData에 br_sla_deadline_at 필드 추가
- `src/app/(protected)/reports/[id]/ReportDetailContent.tsx` — BR Case Info에 SLA 타이머 표시
- `src/app/api/crawler/br-monitor-result/route.ts` — 상태 변경 시 SLA deadline 재계산 훅 추가

### SLA 헬퍼 (Unit A에서 이미 구현, 변경 없음)
- `src/lib/br-case/sla.ts` — calculateSlaDeadline, getSlaStatus, formatSlaRemaining, findSlaConfig
