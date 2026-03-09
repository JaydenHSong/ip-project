# R07: 케이스 연결 (Parent-Child)

> **중요도**: ★★★☆☆ (중간)
> **난이도**: ★★☆☆☆ (낮음)
> **Phase**: 1
> **의존성**: 없음 (기존 데이터 모델 활용)
> **병렬 가능**: ✅ 완전 독립

---

## 1. 문제

한 리스팅에 대해 PD Reporting → BR 신고 → 재제출 → 에스컬레이션으로 여러 리포트가 생김.
이들 간의 관계가 보이지 않아 "이 건 몇 번째 시도인지", "이전에 어떤 결과였는지" 파악 불가.

## 2. 솔루션 (Zendesk Parent-Child Tickets 참조)

### 2.1 기존 데이터 모델 활용

이미 `reports` 테이블에 존재하는 필드:
- `parent_report_id UUID` — 원본 리포트 참조
- `escalation_level INT` — 에스컬레이션 단계
- `resubmit_count INT` — 재제출 횟수

### 2.2 UI — 케이스 체인 시각화

Report Detail 상단에 체인 표시:

```
┌─────────────────────────────────────────────────────┐
│ Case Chain                                           │
│                                                      │
│  📄 #a1b2 (SC)     →  📄 #c3d4 (BR)     →  현재    │
│  Draft → Submitted    Draft → Monitoring    Monitoring│
│  Mar 1              Mar 3                  Mar 6     │
│  ❌ Unresolved       ⏳ Awaiting Amazon              │
└─────────────────────────────────────────────────────┘
```

### 2.3 리스팅 기반 그룹핑

같은 `listing_id`를 가진 모든 리포트를 그룹으로 묶어 표시.

## 3. 구현 범위

### 3.1 API
- `GET /api/reports/[id]/related` — 관련 리포트 조회
  - parent chain (상위)
  - children (하위)
  - same listing (같은 리스팅)

### 3.2 UI
- `CaseChain.tsx` — 수평 체인 컴포넌트
- `RelatedReports.tsx` — 관련 리포트 리스트
- Report Detail에 배치

## 4. 작업량 추정

| 항목 | 예상 |
|------|------|
| API 엔드포인트 | 1시간 |
| CaseChain 컴포넌트 | 1.5시간 |
| RelatedReports 컴포넌트 | 1시간 |
| Report Detail 통합 | 30분 |
| **합계** | **~4시간** |
