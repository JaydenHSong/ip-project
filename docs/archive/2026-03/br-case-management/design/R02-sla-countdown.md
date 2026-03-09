# R02: SLA 카운트다운 뱃지

> **중요도**: ★★★★☆ (높음)
> **난이도**: ★★★☆☆ (중간)
> **Phase**: 2
> **의존성**: R1 (상태 분리), R11 (모니터링 워커)
> **병렬 가능**: ✅ SLA 설정 테이블 + UI 컴포넌트는 독립 작업, 실제 데이터 연동은 R11 후

---

## 1. 문제

케이스가 제출된 후 아마존의 응답까지 얼마나 걸리고 있는지 시각적으로 파악 불가.
오래된 미응답 건이 묻힘. 긴급한 건과 여유 있는 건의 구분이 안 됨.

## 2. 솔루션 (Zendesk/Freshdesk 참조)

### 2.1 SLA 타이머

```
케이스 제출 시점 → SLA 시작
  ├── 아마존 응답 전: "제출 후 N시간 경과"
  ├── 아마존 응답 후 Action Required: "아마존 요청 후 N시간 경과"
  └── 우리 답장 후: "답장 후 N시간 경과 (아마존 대기)"
```

### 2.2 색상 체계

| 상태 | 색상 | 조건 |
|------|------|------|
| On Track | 🟢 초록 | 기한 내 (>24h 남음) |
| Warning | 🟡 노랑 | 기한 임박 (<24h) |
| Breached | 🔴 빨강 | 기한 초과 |
| Paused | ⚪ 회색 | 아마존 대기 중 (우리 행동 불필요) |

### 2.3 기본 SLA 설정

| 위반 카테고리 | 예상 응답 시간 | 경고 기준 |
|--------------|:-------------:|:--------:|
| Intellectual Property (V01~V06) | 72h (3일) | 48h |
| Listing Content (V07~V11) | 120h (5일) | 96h |
| Review Manipulation (V12~V14) | 120h (5일) | 96h |
| Selling Practice (V15~V17) | 120h (5일) | 96h |
| Regulatory Safety (V18~V19) | 72h (3일) | 48h |

Settings 페이지에서 관리자가 수정 가능.

## 3. 구현 범위

### 3.1 DB
- `br_sla_configs` 테이블 (Master Plan 참조)
- `reports.br_sla_deadline_at` 컬럼

### 3.2 UI 컴포넌트
- `SlaBadge.tsx` — 카운트다운 뱃지 컴포넌트
  - Props: `deadline: Date`, `paused: boolean`
  - 실시간 카운트다운 (1분마다 갱신)
  - 색상 자동 전환
- Reports 리스트에 SLA 컬럼 추가
- Report Detail에 SLA 타이머 표시
- Settings > SLA 설정 페이지

### 3.3 API
- `GET /api/settings/sla` — SLA 설정 조회
- `PATCH /api/settings/sla` — SLA 설정 수정 (admin only)
- SLA 계산 로직: `br_sla_deadline_at = last_status_change + config.expected_response_hours`

### 3.4 자동화
- 모니터링 워커에서 상태 변경 시 SLA deadline 재계산
- 아마존 응답 시 SLA 타이머 pause
- Action Required 시 SLA 타이머 restart

## 4. 작업량 추정

| 항목 | 예상 |
|------|------|
| DB 마이그레이션 | 15분 |
| SlaBadge 컴포넌트 | 1시간 |
| SLA 계산 로직 | 30분 |
| Reports 리스트 연동 | 30분 |
| Report Detail 연동 | 20분 |
| Settings 페이지 | 1시간 |
| **합계** | **~3.5시간** |
