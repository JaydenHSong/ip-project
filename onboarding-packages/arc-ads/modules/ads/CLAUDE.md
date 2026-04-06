# AD Optimizer Module — Claude Context

> 이 파일은 AD Optimizer 모듈 작업 시 Claude가 참조하는 컨텍스트입니다.

## Module Info

- **Module**: AD Optimizer (광고 최적화)
- **Path**: `/ads/*`
- **DB Schema**: `ads`
- **Status**: 개발 시작

## 작업 범위

```
src/app/(protected)/ads/     ← 페이지 (라우트)
src/modules/ads/             ← 비즈니스 로직
  ├── components/            ← AD 전용 컴포넌트
  ├── lib/                   ← AD 비즈니스 로직
  ├── types/                 ← AD 타입 정의
  └── constants/             ← AD 상수
```

## 절대 금지

- `modules/ip/` import 금지
- `public.*` IP 테이블 (reports, listings, campaigns 등) 직접 접근 금지
- `/api/ip/*` 또는 `/api/crawler/*` API 호출 금지

## 사용 가능

- `components/ui/*` — 공통 UI
- `lib/auth/*` — 인증
- `lib/supabase/*` — DB 클라이언트
- `lib/i18n/*` — 다국어
- `modules/shared/*` — 공유 유틸
- `public.users` — 사용자 테이블 (읽기)
- `public.system_configs` — 설정 테이블 (읽기)
- `public.org_units` — 조직 트리 (읽기, 접근 제어용)
- `public.user_org_units` — 사용자 소속 (읽기)
- `public.module_access_configs` — 모듈 접근 설정 (읽기)

## 페이지 구성

| 페이지 | 경로 | 설명 |
|:--|:--|:--|
| Dashboard | `/ads/dashboard` | AD 성과 대시보드 |
| Campaigns | `/ads/campaigns` | 광고 캠페인 관리 |
| Keywords | `/ads/keywords` | 키워드 관리 |
| Budget | `/ads/budget` | 예산 최적화 |
| Reports | `/ads/reports` | 광고 리포트 |

## 모듈 등록

이미 `src/constants/modules.ts`에 AD 모듈이 등록되어 있음.
`status: 'coming_soon'` → `status: 'active'`로 변경하면 사이드바에서 접근 가능.
