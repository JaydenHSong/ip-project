# Crawler Download UI Planning Document

> **Summary**: Settings 페이지에 크롤러 상태 확인 + 설치 가이드 + 다운로드 섹션 추가
>
> **Project**: Sentinel
> **Author**: Claude
> **Date**: 2026-03-04
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

Settings 페이지에 Crawler 관리 탭을 추가하여, 관리자가 크롤러 연결 상태를 확인하고 설치/배포에 필요한 파일을 다운로드할 수 있게 한다.

### 1.2 Background

- Crawler가 Railway에 배포 완료됨 (`sentinel-crawler-production.up.railway.app`)
- 현재 크롤러 상태를 웹에서 확인할 방법이 없음
- 신규 환경에 크롤러를 설치하려면 설정 파일과 가이드가 필요

---

## 2. Scope

### 2.1 In Scope

- [x] Settings에 "Crawler" 탭 추가 (Admin 전용)
- [x] 크롤러 헬스체크 상태 표시 (연결됨/끊김/에러)
- [x] 크롤러 설정 정보 표시 (API URL, 버전, uptime)
- [x] 설치 가이드 + 설정 파일 다운로드 버튼
- [x] i18n 지원 (EN/KO)

### 2.2 Out of Scope

- 크롤러 원격 제어 (시작/중지)
- 크롤러 로그 실시간 보기
- 캠페인 스케줄 관리 (이미 Campaigns 페이지에 있음)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | Settings에 Crawler 탭 표시 (Admin 전용) | High | Pending |
| FR-02 | 크롤러 Health API 호출 → 상태 표시 (ok/degraded/error/disconnected) | High | Pending |
| FR-03 | 연결 정보 표시: URL, uptime, Redis 상태, Worker 상태 | Medium | Pending |
| FR-04 | `.env.example` 다운로드 버튼 (크롤러 설정 템플릿) | High | Pending |
| FR-05 | `docker-compose.yml` 다운로드 버튼 | Medium | Pending |
| FR-06 | 설치 가이드 표시 (Railway/Docker 배포 단계) | Medium | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria |
|----------|----------|
| Performance | Health check 결과 5초 캐시 |
| UX | 상태 뱃지: 초록(ok), 노랑(degraded), 빨강(error), 회색(disconnected) |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [x] Crawler 탭이 Settings에 표시됨
- [x] Health check 상태가 실시간 표시됨
- [x] 설정 파일 다운로드가 작동함
- [x] EN/KO 번역 완료
- [x] 빌드 성공 (typecheck + lint)

---

## 5. Technical Approach

### 5.1 파일 구조

```
src/app/(protected)/settings/
  CrawlerSettings.tsx          ← 새로 생성 (크롤러 관리 UI)
  SettingsContent.tsx          ← 수정 (Crawler 탭 추가)

src/app/api/settings/
  crawler-status/route.ts      ← 새로 생성 (Health proxy API)

src/lib/i18n/locales/
  en.ts                        ← 수정 (settings.crawler 번역 추가)
  ko.ts                        ← 수정 (settings.crawler 번역 추가)
```

### 5.2 API 설계

**GET `/api/settings/crawler-status`**
- Health check proxy: 서버에서 Railway 크롤러 `/health` 호출
- 응답: `{ status, uptime, redis, worker, timestamp, url }`
- 크롤러 URL은 환경변수 `CRAWLER_HEALTH_URL`에서 읽음
- 인증: Admin 전용 (withAuth)

### 5.3 다운로드 파일

| 파일 | 용도 | 방식 |
|------|------|------|
| `.env.example` | 환경변수 템플릿 | API Route로 동적 생성 (서비스 토큰 제외) |
| `docker-compose.yml` | Docker 배포 설정 | 정적 파일 다운로드 |
| 설치 가이드 | 배포 단계 | 페이지 내 표시 (다운로드 아님) |

### 5.4 UI 레이아웃

```
┌─────────────────────────────────────────────┐
│ Crawler Status                              │
│ ┌─────────────────────────────────────────┐ │
│ │ ● Connected (ok)          Uptime: 2h    │ │
│ │ Redis: ✅  Worker: ✅                   │ │
│ │ URL: sentinel-crawler-production...     │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ Crawler Setup                               │
│ ┌─────────────────────────────────────────┐ │
│ │ 1. Download config files               │ │
│ │    [📥 .env.example] [📥 docker-compose]│ │
│ │                                         │ │
│ │ 2. Set environment variables            │ │
│ │    SENTINEL_API_URL=https://...         │ │
│ │    SENTINEL_SERVICE_TOKEN=***           │ │
│ │    REDIS_URL=redis://...               │ │
│ │    BRIGHTDATA_PROXY_HOST=...           │ │
│ │                                         │ │
│ │ 3. Deploy                              │ │
│ │    railway up  또는  docker compose up  │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

---

## 6. Risks and Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| 크롤러 URL 미설정 시 에러 | Low | "Not configured" 상태 표시 |
| Health check 타임아웃 | Low | 3초 timeout + 에러 핸들링 |

---

## 7. Next Steps

1. [ ] Design 문서 작성 (`/pdca design crawler-download-ui`)
2. [ ] 구현 시작
3. [ ] Gap Analysis

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-04 | Initial draft | Claude |
