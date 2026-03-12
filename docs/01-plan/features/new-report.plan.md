# Plan: New Report Flow Redesign

## Status: APPROVED
## Created: 2026-03-12

---

## 1. 문제 정의

현재 New Report 페이지(`/reports/new`)는 별도 전체 페이지 폼으로, Report Detail 페이지와 완전히 다른 레이아웃과 UX를 가진다. 사용자가 ASIN, marketplace, title, seller, violation type, note, screenshot 등을 모두 수동으로 입력해야 하며, 생성 후 다시 detail 페이지로 이동하면 전혀 다른 UI를 마주한다.

**핵심 문제:**
- New Report 폼 ≠ Report Detail → UX 불일치
- 수동 입력이 많음 → ASIN만 있으면 Extension이 나머지 정보 추출 가능
- 별도 페이지 전환 → 워크플로우 단절

## 2. 목표

"New Report" 버튼 → **ASIN + Marketplace 팝업만** → Extension이 정보 추출 → Draft 자동 생성 → Report Detail 페이지로 리다이렉트

**결과:** NewReportForm 전체 페이지 제거, Report Detail이 유일한 편집 화면

## 3. 플로우 설계

```
[Report Queue]
     │
     ▼ "New Report" 클릭
┌──────────────────────────┐
│  ASIN + Marketplace 팝업  │
│  ┌─────────────────────┐ │
│  │ ASIN: [B0XXXXXXXXX] │ │
│  │ MP:   [US ▼       ] │ │
│  └─────────────────────┘ │
│          [Create]        │
└──────────────────────────┘
     │
     ▼ Create 클릭
┌──────────────────────────┐
│ 1. extension_fetch_queue │
│    에 ASIN 삽입           │
│ 2. 10초 폴링 대기         │
│    (로딩 스피너 표시)       │
└──────────────────────────┘
     │
     ├─ Extension 응답 (성공)
     │  → listing 정보 자동 채움
     │  → Draft 생성 (API)
     │  → /reports/:id 로 이동
     │
     └─ 10초 타임아웃 (Extension 오프라인)
        → 경고 팝업: "Extension을 확인해주세요"
        → "수동 생성" 버튼 제공
        → 수동 생성 시: 최소 정보로 Draft 생성
        → /reports/:id 로 이동
```

## 4. 구현 범위

### 4.1 ASIN Popup Modal (신규)
- `ReportsContent.tsx` 내 모달로 구현 (별도 페이지 X)
- 필드: ASIN (필수), Marketplace (드롭다운, 기본 US)
- Create 버튼: ASIN 유효성 검증 (10자리 영숫자)

### 4.2 API: `/api/reports/create-from-asin` (신규)
- ASIN + marketplace 받아서:
  1. `extension_fetch_queue`에 `{ asin, marketplace, type: 'listing_info' }` 삽입
  2. 큐 ID 반환
- 별도 API: `/api/ext/fetch-result` (기존) — Extension 결과 확인용 폴링

### 4.3 Draft 생성 API 수정
- 기존 `/api/reports/manual` 수정 또는 새 endpoint
- ASIN + marketplace 만으로 Draft 생성 가능하도록
- `br_form_type` 없어도 OK (detail에서 선택)
- `user_violation_type`, `violation_category` 필수 제거 → detail에서 입력

### 4.4 Extension Fetch Flow
- 기존 `extension_fetch_queue` + `fetch-result` 메커니즘 활용
- Extension이 ASIN으로 아마존 페이지 방문 → title, seller, price, screenshot 추출
- 결과를 `fetch-result` API로 반환

### 4.5 Frontend Polling
- Create 클릭 후 `fetch-result`를 1초 간격으로 폴링 (최대 10초)
- 성공: listing 데이터로 Draft 생성 → navigate
- 타임아웃: 경고 표시 + 수동 생성 fallback

### 4.6 기존 NewReportForm 페이지
- `/reports/new` 라우트 및 `NewReportForm.tsx` 삭제
- "New Report" 버튼 href 변경 → 모달 오픈

## 5. 영향 받는 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/app/(protected)/reports/ReportsContent.tsx` | New Report 버튼 → 모달 오픈 |
| `src/app/(protected)/reports/new/` | **삭제** (전체 디렉토리) |
| `src/app/api/reports/create-from-asin/route.ts` | **신규** — 큐 삽입 + 폴링 |
| `src/app/api/reports/manual/route.ts` | 수정 — 필수 필드 완화 |
| `src/components/features/NewReportModal.tsx` | **신규** — ASIN 팝업 모달 |

## 6. DB 변경

없음. 기존 `extension_fetch_queue` 테이블 그대로 사용.

## 7. 비기능 요구사항

- Extension 오프라인 시에도 수동으로 리포트 생성 가능해야 함
- 중복 ASIN 체크 유지 (기존 로직)
- 로딩 상태 명확히 표시 (스피너 + 메시지)

## 8. 제외 범위

- Extension 측 코드 변경 (기존 fetch-queue 폴링 로직 활용)
- 템플릿 선택 (detail 페이지에서 처리)
- 스크린샷 업로드 (Extension이 자동 처리, 수동은 detail에서)
