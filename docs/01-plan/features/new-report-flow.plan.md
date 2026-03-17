# New Report Flow — Plan

> **Feature**: New Report 프로세스 재설계 — ASIN 입력만으로 Draft 생성, 백그라운드 크롤링, 관리자 신고서 작성
> **Created**: 2026-03-16
> **Phase**: Plan
> **Priority**: High
> **Depends on**: v2-workflow-pivot

---

## 1. Background

### 현재 문제점
- New Report 모달에서 ASIN + marketplace + violation type + 기타 필드를 한꺼번에 입력해야 함
- 진입 장벽 높음 — 관리자가 모든 정보를 미리 알아야 시작 가능
- listings 테이블에 정보 누락 많음 (title, seller_name 등 빈 값)
- `listing_snapshot`이 생성 시 채워지지 않아 검색 실패 (별도 수정 완료)

### 목표
- **ASIN만 넣으면 시작** — 나머지는 크롤러가 수집 + 관리자가 작성
- **크롤러가 조용히 정보 수집** — Draft 작성 중 백그라운드로
- **수동 입력/수정 항상 가능** — 크롤러 실패해도 진행 가능

---

## 2. User Flow

```
[New Report 버튼]
    → [팝업: ASIN 입력 + Marketplace 선택]
    → [중복 체크]
        → Complete/Archived: 바로 생성
        → Monitoring/Draft/Pending: "이 ASIN은 {status}에 있습니다. 새로 만들까요?" 확인
        → 없음: 바로 생성
    → [Draft 즉시 생성]
    → [Draft 상세 페이지로 이동]
        → 백그라운드: 크롤러가 상품 정보 수집
        → 정보 도착 시 Draft에 자동 반영
        → 관리자: 위반유형 선택, 템플릿 적용, 신고서 작성
        → [크롤러 리프레시 버튼] — 언제든 다시 수집 가능
    → [Submit]
```

---

## 3. 기능 상세

### 3.1 New Report 팝업 (간소화)

**입력 필드:**
- ASIN (필수) — 텍스트 입력
- Marketplace (필수) — 드롭다운, 기본값 US

**제거하는 필드 (팝업에서):**
- violation type — Draft 상세에서 선택
- title, seller_name — 크롤러가 수집
- note, screenshot — Draft 상세에서 입력

### 3.2 중복 체크 로직

| 기존 리포트 상태 | 동작 |
|:--|:--|
| 없음 | 즉시 Draft 생성 |
| `resolved`, `archived` | 즉시 Draft 생성 (완료된 건이므로) |
| `draft`, `pending_review`, `approved` | 경고: "이 ASIN에 대한 {status} 리포트가 있습니다. 새로 만들까요?" |
| `monitoring`, `br_submitting` | 경고: "이 ASIN이 모니터링 중입니다. 새로 만들까요?" |

### 3.3 Draft 생성

1. listings 테이블에서 ASIN 조회
   - 있으면 → `listing_id` 연결
   - 없으면 → listings에 새 행 INSERT (asin, marketplace만)
2. reports 테이블에 Draft INSERT
   - `listing_id`, `listing_snapshot` (있는 정보로), `status: 'draft'`, `created_by`
3. 백그라운드 크롤링 트리거

### 3.4 백그라운드 크롤링

**트리거 조건:**
- listings에 정보가 없거나 누락된 경우 (title, seller_name, images 등)
- 관리자가 리프레시 버튼을 누른 경우

**수집 대상:**
- title, seller_name, brand, price, images, bullet_points, description, rating, review_count

**동작:**
1. `/api/ext/fetch-queue`에 크롤링 요청 등록 (기존 Extension fetch 인프라 활용)
2. 크롤러가 아마존 상품 페이지 방문 → 정보 수집
3. 수집 완료 → listings 테이블 업데이트 + listing_snapshot 업데이트
4. Draft 상세 페이지에서 polling 또는 실시간 반영

**크롤링 실패 시:**
- 에러 표시 + 수동 입력 유도
- 리프레시 버튼으로 재시도 가능

### 3.5 Draft 상세 페이지 (기존 리포트 상세 확장)

**크롤러 관련 추가 요소:**
- 크롤링 상태 표시: `수집 중...` / `수집 완료` / `수집 실패`
- **리프레시 버튼** — 크롤러 재실행
- 수집된 정보 자동 반영 (title, seller, images 등)

**관리자 작성 필드:**
- violation type 선택
- BR 템플릿 선택 → 본문 자동 생성
- AI 드래프트 (선택)
- screenshot 업로드
- note 작성

### 3.6 Submit

기존 Submit 플로우 유지:
- Draft → Submit Review → Pending Review → Approve → BR 제출

---

## 4. 영향 범위

### 수정 대상
| 파일/서비스 | 변경 내용 |
|:--|:--|
| `NewReportModal.tsx` | 간소화 — ASIN + Marketplace만 |
| `/api/reports/manual/route.ts` | ASIN만으로 Draft 생성 + 크롤링 트리거 |
| **`sentinel-fetch` (신규 서비스)** | 단건 상품 정보 수집 전용 크롤러 (Railway) |
| `ReportDetail` 관련 | 크롤링 상태 표시 + 리프레시 버튼 |
| `listing_snapshot` | 크롤링 완료 시 자동 업데이트 |

### 유지 (변경 없음)
- BR 제출 플로우
- 템플릿 시스템
- AI 드래프트
- 기존 캠페인 크롤러 (`sentinel-crawl`) — 완전 독립

---

## 5. 기술 고려사항

### 크롤링 방식 — sentinel-fetch (전용 서비스, 확정)
- **기존 캠페인 크롤러(`sentinel-crawl`)와 완전 분리**
- Railway에 새 서비스 `sentinel-fetch` 추가
- Bright Data Browser API 공유 (동일 zone: `scraping_browser1`)
- 단순한 API: `POST /fetch` → ASIN + marketplace → 상품 정보 수집 → Supabase 업데이트
- 장애 격리: sentinel-fetch 장애 시 캠페인 크롤러 영향 없음, 역방향도 마찬가지
- Extension 불필요 — 서버사이드 독립 동작

### 실시간 반영
- Draft 상세에서 주기적 polling (5초 간격)
- 단순하고 충분함

### 크롤러 리프레시 쿨다운
- 같은 ASIN에 대해 5분 이내 중복 요청 방지
- 쿨다운 표시: "3분 후 다시 시도 가능"

---

## 6. 마일스톤

| Phase | 내용 | 예상 |
|:--|:--|:--|
| **P1** | NewReportModal 간소화 + ASIN 중복 체크 | 작음 |
| **P2** | sentinel-fetch 서비스 생성 (Railway) + API | 중간 |
| **P3** | Draft 생성 → sentinel-fetch 트리거 연동 | 작음 |
| **P4** | Draft 상세 크롤링 상태 + 리프레시 버튼 + polling | 작음 |
| **P5** | listing_snapshot 자동 업데이트 | 작음 |

---

## 7. Open Questions

1. ~~크롤링 방식~~ → **sentinel-fetch 전용 서비스 (확정)**
2. Marketplace 기본값이 US 아닌 경우가 있는지? (현재 대부분 US)
3. 크롤러 리프레시 쿨다운 시간 — 5분이 적절한지?
