# Plan: Sentinel Chrome Extension

## Overview

Spigen 오퍼레이터(20명+)가 아마존 상품 페이지에서 위반 리스팅을 원클릭으로 제보하는 Chrome Extension.
아마존 상품 페이지 정보를 자동 캡처하고, 위반 유형 선택 후 Sentinel Web API로 전송합니다.

## Problem Statement

현재 OMS Extension은 10개 위반 유형, AI 분석 없음, 상태 추적 없음으로 기능이 제한적.
Sentinel Extension은 19개 위반 유형, AI 미리보기, 중복 체크, 내 제보 상태 확인 등 고도화된 기능을 제공합니다.

## Target Users

| 사용자 | 인원 | 사용 시나리오 |
|--------|------|-------------|
| 아마존 오퍼레이터 | 20명+ | 아마존 모니터링 중 위반 발견 시 원클릭 제보 |

## Core Features (P0)

| ID | Feature | Description |
|----|---------|-------------|
| F06 | 페이지 정보 자동 캡처 | Content Script로 ASIN, 제목, 판매자, 가격, 이미지 URL, bullet points 파싱 |
| F07 | 위반 유형 선택 UI | 5개 카테고리 × 19개 위반 유형 그룹화 셀렉터 + 메모 입력 |
| F08 | 스크린샷 자동 캡처 | `chrome.tabs.captureVisibleTab()` 증거 보존 |
| F09 | Sentinel Web API 연동 | 신고 요청 전송 (listings 생성 + reports 생성) |

## Enhanced Features (P1, OMS 대비 진화)

| Feature | Description |
|---------|-------------|
| AI 분석 미리보기 | 제보 후 Extension 팝업에서 AI 분석 결과 실시간 표시 |
| 중복 체크 | 제보 시 동일 ASIN 기존 신고 여부 경고 |
| 내 제보 상태 | 팝업에서 최근 제보 상태 (Draft → Submitted → Resolved) 확인 |
| 버전 업데이트 알림 | 새 버전 배포 시 설치 유도 알림 (F31) |

## Technical Stack

| 영역 | 기술 |
|------|------|
| Platform | Chrome Manifest V3 |
| UI | HTML + CSS + TypeScript (빌드: Vite 또는 webpack) |
| 인증 | Supabase Auth (Google OAuth @spigen.com) |
| API 통신 | Sentinel Web API (HTTPS + JWT) |
| 배포 | .crx 사내 직접 배포 (향후 Google Workspace Admin Console) |

## Architecture

```
┌─────────────────────────────────────────────┐
│ Chrome Extension (Manifest V3)              │
│                                              │
│ ┌──────────────┐  ┌──────────────────────┐  │
│ │Content Script │  │ Popup                │  │
│ │(amazon.com)   │  │ - 위반 유형 선택     │  │
│ │- DOM 파싱     │──│ - 메모 입력          │  │
│ │- ASIN 추출    │  │ - 제보 제출          │  │
│ │- 플로팅 버튼  │  │ - 내 제보 상태       │  │
│ └──────────────┘  └──────────────────────┘  │
│                                              │
│ ┌──────────────────────────────────────────┐ │
│ │ Service Worker (Background)              │ │
│ │ - Supabase Auth 관리                     │ │
│ │ - API 통신 (JWT)                         │ │
│ │ - 스크린샷 캡처                          │ │
│ │ - 알림/배지 관리                         │ │
│ └──────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
              │ HTTPS + JWT
              ▼
┌─────────────────────────────────────────────┐
│ Sentinel Web API                            │
│ POST /api/listings (리스팅 생성)            │
│ POST /api/reports (신고 생성)               │
│ GET  /api/reports?created_by=me (내 제보)   │
│ POST /api/listings/check-duplicate (중복)   │
└─────────────────────────────────────────────┘
```

## File Structure

```
extension/
  manifest.json              # Manifest V3 설정
  src/
    content/
      index.ts               # Content Script (DOM 파싱 + 플로팅 버튼)
      parser.ts              # 아마존 페이지 파서 (ASIN, 제목, 판매자 등)
    popup/
      popup.html             # 팝업 UI
      popup.ts               # 팝업 로직
      components/            # UI 컴포넌트 (위반유형 선택, 메모 입력 등)
    background/
      service-worker.ts      # Service Worker (인증, API, 스크린샷)
    shared/
      types.ts               # 공유 타입
      api.ts                 # Sentinel API 클라이언트
      violations.ts          # 위반 유형 상수 (Web과 동일)
      storage.ts             # chrome.storage 래퍼
  assets/
    icons/                   # Extension 아이콘 (16, 48, 128px)
    styles/                  # CSS
  vite.config.ts             # 빌드 설정
  package.json
  tsconfig.json
```

## Security Requirements

- HTTPS 필수 (TLS 1.3)
- CORS: Sentinel Web 도메인만 허용
- Origin 검증: `chrome-extension://` 출처 확인
- Supabase Auth JWT 토큰 (매 요청 검증)
- Content Script 권한: `amazon.com` 도메인만 `host_permissions`
- 코드에 API 키/시크릿 하드코딩 금지

## Deployment Strategy

| Phase | 방식 | 비고 |
|-------|------|------|
| 초기 | .crx Side-loading | 개발자 모드 필요, 수동 배포 |
| 안정화 후 | Google Workspace Admin Console | ExtensionInstallForcelist 강제 배포, 자동 업데이트 |

## Implementation Milestones

### MS1: 기본 제보 기능 (P0)
1. Manifest V3 + 빌드 환경 설정
2. Content Script — 아마존 DOM 파싱 + 플로팅 버튼
3. Popup UI — 위반 유형 선택 + 메모 입력
4. Service Worker — Supabase Auth (Google OAuth)
5. API 통신 — listings + reports 생성
6. 스크린샷 캡처 + Supabase Storage 업로드

### MS2: 고도화 (P1)
7. 중복 ASIN 체크 (제보 전 경고)
8. AI 분석 미리보기 (제보 후 팝업에서 확인)
9. 내 제보 상태 목록
10. 버전 업데이트 알림

## Dependencies

- Sentinel Web API가 동작 중이어야 함 (listings, reports 엔드포인트)
- Supabase Auth 설정 완료 (Google OAuth)
- 위반 유형 상수 (`constants/violations.ts`)를 Extension에서도 동일하게 사용

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| 아마존 DOM 구조 변경 | Content Script 파싱 실패 | 셀렉터 추출을 별도 파일로 분리, 빠른 업데이트 가능 |
| Manifest V3 제약 | Background persistent 불가 | Service Worker + chrome.alarms 활용 |
| Side-loading 제거 위험 | Chrome 정책 변경 시 설치 불가 | Admin Console 강제 배포로 조기 전환 |

## Success Criteria

- [ ] 아마존 상품 페이지에서 플로팅 버튼 노출
- [ ] 원클릭으로 ASIN/제목/판매자/가격 자동 캡처
- [ ] 19개 위반 유형 중 선택 + 메모 작성
- [ ] 스크린샷 자동 캡처
- [ ] Sentinel Web 신고 대기열에 제보 도착
- [ ] @spigen.com 계정으로만 인증 가능

## Reference

- `Sentinel_Project_Context.md` — 전체 기획 (F06~F09, D12, D47)
- `docs/archive/2026-03/sentinel/sentinel.design.md` — Web API 스키마 (listings, reports 테이블)
