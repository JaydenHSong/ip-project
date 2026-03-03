# Monday.com API 동기화 Planning Document

> **Summary**: Monday.com GraphQL API를 통해 3개 보드(기술특허/상표DB/저작권)의 IP 자산 데이터를 Sentinel `ip_assets` 테이블에 단방향 자동 동기화
>
> **Project**: Sentinel
> **Author**: Claude
> **Date**: 2026-03-03
> **Status**: Draft
> **Feature ID**: F25 (Monday.com 특허 데이터 자동 동기화)
> **Decision**: D19, D46

---

## 1. Overview

### 1.1 Purpose

Monday.com에서 관리하는 Spigen IP 자산(특허/상표/저작권) 데이터를 Sentinel DB로 자동 동기화하여, AI 위반 분석 시 실시간 IP 자산 대조가 가능하도록 한다.

### 1.2 Background

- **1단계 완료**: IP Registry UI + 수동 CRUD (`patents-registry` PDCA 98% → archived)
- **현재**: 데모 데이터 8건만 존재, Monday.com API 미연동
- Monday.com = **Single Source of Truth (SSOT)** — Sentinel은 읽기 전용 동기화
- 기존 코드(`monday-sync.ts`)는 구 `patents` 테이블 기반 → `ip_assets` 테이블 + 멀티보드로 재작성 필요

### 1.3 Monday.com 보드 구조 (확인 완료)

| 보드 # | 이름 | IP Type | 동기화 대상 |
|:------:|------|---------|:---------:|
| 3 | 기술특허 | patent | Yes |
| 5 | ✅상표DB | trademark | Yes |
| 6 | 저작권 | copyright | Yes |
| 8 | 온라인 플랫폼 IP신고(HQ) | - | No (향후) |

### 1.4 Related Documents

- `Sentinel_Project_Context.md` — "Spigen 특허 레지스트리" 섹션, F25, D19
- `docs/archive/2026-03/patents-registry/` — 1단계 plan/design/analysis/report
- 기존 코드: `src/lib/patents/monday-sync.ts` (구버전), `src/app/api/patents/sync/route.ts` (stub)

---

## 2. Scope

### 2.1 In Scope

- [ ] Monday.com GraphQL API 멀티보드 조회 (보드 3/5/6)
- [ ] 보드별 컬럼 → `ip_assets` 필드 매핑 로직
- [ ] 한국어 상태값 → Sentinel status 변환 매핑
- [ ] Supabase `ip_assets` 테이블에 upsert (monday_item_id 기준)
- [ ] Admin 수동 동기화 트리거 (POST /api/patents/sync)
- [ ] 동기화 결과 UI (마지막 동기화 시간, 건수, 에러)
- [ ] Settings 페이지에 Monday.com 설정 섹션
- [ ] 동기화 감사 로그 기록
- [ ] 환경변수 기반 API 키/보드 ID 관리

### 2.2 Out of Scope

- 자동 스케줄링 (cron job) — Vercel Cron 또는 외부 스케줄러, 배포 단계에서 설정
- Monday.com → Sentinel 양방향 동기화 (설계상 단방향만)
- Board 8 (IP신고 HQ) 연동 — 향후 별도 기능
- Monday.com Webhook 실시간 동기화 — 향후 고려

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Note |
|----|-------------|----------|------|
| FR-01 | 3개 보드 데이터를 ip_assets 테이블에 동기화 | High | 핵심 기능 |
| FR-02 | 보드별 컬럼 매핑 (관리번호, 이름, 상태, 출원/등록 정보 등) | High | design doc §10 참조 |
| FR-03 | 한국어 상태값 → Sentinel status 자동 변환 | High | design doc §1.2 참조 |
| FR-04 | monday_item_id 기준 upsert (중복 방지) | High | |
| FR-05 | Admin 수동 동기화 버튼 (IP Registry 페이지 헤더) | High | |
| FR-06 | 동기화 진행 상태 표시 (로딩/성공/에러) | Medium | |
| FR-07 | 동기화 결과 요약 (생성/업데이트/스킵/에러 건수) | Medium | |
| FR-08 | Settings 페이지에 Monday.com 연결 상태 표시 | Medium | API 키 설정 여부 |
| FR-09 | 동기화 실행 시 audit_logs에 기록 | Medium | |
| FR-10 | Monday.com에서 삭제된 항목 처리 (soft delete 또는 상태 변경) | Low | |

### 3.2 Non-Functional Requirements

| Category | Criteria |
|----------|----------|
| 보안 | API 키는 서버 환경변수만 사용, 클라이언트 노출 금지 |
| 성능 | 500건 이하 3개 보드 동기화 30초 이내 |
| 에러 처리 | 개별 아이템 에러가 전체 동기화를 중단시키지 않음 |
| 호환성 | 기존 수동 등록 데이터(monday_item_id=null)와 공존 |

---

## 4. Architecture

### 4.1 동기화 흐름

```
Admin 클릭 "Sync Now"
    ↓  POST /api/patents/sync
monday-sync.ts: fetchMondayBoard(boardId) × 3 보드
    ↓  GraphQL API (Board 3 → patent, Board 5 → trademark, Board 6 → copyright)
컬럼 매핑: transformMondayItem(item, boardConfig) → IpAsset
    ↓
Supabase upsert (ip_assets, conflict: monday_item_id)
    ↓
결과 반환: { total, created, updated, unchanged, errors }
    ↓
audit_logs 기록
```

### 4.2 기존 코드 재사용/변경

| 파일 | 현재 상태 | 변경 내용 |
|------|----------|----------|
| `src/lib/patents/monday-sync.ts` | 구 `patents` 테이블 기반, 단일 보드 | **전면 재작성** — 멀티보드, ip_assets, Supabase client 사용 |
| `src/app/api/patents/sync/route.ts` | POST stub (501 반환) | **구현** — 실제 동기화 호출 |
| `src/types/ai.ts` | MondaySyncResult 타입 | 유지 또는 확장 |

### 4.3 새로 만들 파일

| 파일 | 용도 |
|------|------|
| `src/lib/patents/board-config.ts` | 보드별 컬럼 매핑 + 상태 변환 설정 |
| (없음 — 기존 파일 수정만) | |

### 4.4 수정할 파일

| 파일 | 변경 |
|------|------|
| `src/lib/patents/monday-sync.ts` | 멀티보드 동기화 로직 재작성 |
| `src/app/api/patents/sync/route.ts` | 실 동기화 구현 |
| `src/app/(protected)/patents/PatentsContent.tsx` | Sync 버튼 + 결과 토스트 |
| `src/lib/i18n/locales/en.ts` | sync 관련 i18n 키 추가 |
| `src/lib/i18n/locales/ko.ts` | sync 관련 i18n 키 추가 |

### 4.5 환경변수

| Variable | Purpose | Required |
|----------|---------|:--------:|
| `MONDAY_API_KEY` | Monday.com API 인증 토큰 | Yes |
| `MONDAY_PATENT_BOARD_ID` | Board 3 (기술특허) ID | Yes |
| `MONDAY_TRADEMARK_BOARD_ID` | Board 5 (상표DB) ID | Yes |
| `MONDAY_COPYRIGHT_BOARD_ID` | Board 6 (저작권) ID | Yes |

### 4.6 Monday.com GraphQL API

```graphql
query ($boardId: [ID!]) {
  boards(ids: $boardId) {
    items_page(limit: 500) {
      cursor
      items {
        id
        name
        column_values {
          id
          text
          value
        }
      }
    }
  }
}
```

- API Endpoint: `https://api.monday.com/v2`
- Auth: `Authorization: {API_KEY}` 헤더
- Rate Limit: 분당 60 요청 (free), 초당 5,000 complexity (Pro)
- Pagination: cursor 기반 (500건 초과 시)

---

## 5. Success Criteria

### 5.1 Definition of Done

- [ ] 3개 보드 데이터가 ip_assets 테이블에 정상 동기화
- [ ] 한국어 상태값이 Sentinel status로 정확히 변환
- [ ] 수동 동기화 버튼 클릭 시 결과 표시
- [ ] API 미설정 시 적절한 안내 메시지
- [ ] 기존 수동 등록 데이터에 영향 없음

### 5.2 Quality Criteria

- [ ] TypeScript 타입 에러 0건
- [ ] 린트 에러 0건
- [ ] 빌드 성공

---

## 6. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Monday.com API 키 미발급 | 블로킹 | Medium | 데모 모드 fallback + 설정 안내 UI |
| 보드 컬럼 ID 변경 | Medium | Low | board-config.ts에서 중앙 관리, 런타임 에러 로깅 |
| API Rate Limit 초과 | Medium | Low | 3개 보드 순차 호출, 재시도 로직 |
| 500건 초과 데이터 | Low | Medium | cursor 기반 페이지네이션 구현 |
| Monday.com API 버전 변경 | Low | Low | API-Version 헤더 고정 (2024-01) |

---

## 7. Convention Prerequisites

### 7.1 기존 컨벤션 준수

- [x] Supabase Admin Client 사용 (RLS 우회)
- [x] withAuth 미들웨어 + admin 권한 체크
- [x] 환경변수 기반 설정 (하드코딩 금지)
- [x] i18n 영어/한국어 번역
- [x] 에러 발생 시 개별 아이템 스킵 (전체 중단 방지)

---

## 8. Implementation Order

| 순서 | 작업 | 파일 |
|:----:|------|------|
| 1 | 보드별 컬럼 매핑 설정 | `src/lib/patents/board-config.ts` (신규) |
| 2 | monday-sync.ts 재작성 (멀티보드 + ip_assets) | `src/lib/patents/monday-sync.ts` |
| 3 | sync API route 구현 | `src/app/api/patents/sync/route.ts` |
| 4 | PatentsContent에 Sync 버튼 + 결과 표시 | `PatentsContent.tsx` |
| 5 | i18n 키 추가 | `en.ts`, `ko.ts` |
| 6 | .env.local.example 업데이트 | `.env.local.example` |
| 7 | 빌드 + 타입체크 검증 | - |

---

## 9. Next Steps

1. [ ] Design 문서 작성 (`/pdca design monday-api`)
2. [ ] 구현 시작
3. [ ] Monday.com API 키 발급 요청 (Admin)
4. [ ] 실 보드 컬럼 ID 확인 (API Explorer로)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-03 | Initial draft — 멀티보드 동기화 계획 | Claude |
