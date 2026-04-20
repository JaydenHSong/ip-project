# ARC Platform — 2026 Roadmap (Q2 이후)

> **Feature**: platform-roadmap-2026
> **Status**: Draft
> **Date**: 2026-04-10
> **Parent Plan**: `docs/00-architecture/spigen-platform-architecture.plan.md`

---

## Executive Summary

| 항목 | 값 |
|------|-----|
| **완료 모듈** | 2 / 8 (IP Protection, AD Optimizer) |
| **남은 모듈** | 6 (Product Library, Listing, Reimbursement, Finance, OMS, Product Planning) |
| **추천 시나리오** | C — 하이브리드 (가치 + 데이터 기반) |
| **전체 예상 기간** | ~25주 (6개월) |
| **첫 ROI 목표** | 4주 내 Reimbursement MVP 시작 |

### Value Delivered (4관점)

| Perspective | Description |
|---|---|
| **Problem** | 8개 모듈 중 2개만 완료. 나머지 6개의 우선순위/의존성/일정이 불명확해서 어디부터 손대야 할지 결정 불가. 각 모듈의 구체적 스코프/필요 API/데이터 의존성 문서화 안 됨. |
| **Solution** | 모듈 간 데이터 의존성 그래프 + 모듈별 스코프(페이지/DB/API)/복잡도/기간 추정 + 3개 우선순위 시나리오 제시 + 핵심 의사결정 Q1~Q4 명시. |
| **Function UX Effect** | PM/의사결정자가 이 문서 하나로 "다음 분기 어느 모듈을 누구에게 맡길지" 판단 가능. 각 모듈 착수 시 이 문서가 onboarding의 진입점이 됨. |
| **Core Value** | Product Library 기반 단일 source of truth → 전 모듈 데이터 일관성. Reimbursement 우선 착수로 4주 내 첫 ROI. 총 6개월 계획 가시화. |

---

## 1. 데이터 의존성 그래프

```
                   ┌─────────────────────────────┐
                   │  Product Library (SKU/ASIN) │ ← 모든 모듈의 기반
                   │   products, assets, parent  │
                   └──────────────┬──────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        ▼                         ▼                         ▼
┌───────────────┐        ┌────────────────┐        ┌────────────────┐
│ IP Protection │        │ AD Optimizer ✅│        │    Listing     │
│  (ASIN 보호)  │        │ (ASIN 광고)    │        │  (ASIN 리스팅) │
└───────┬───────┘        └────────┬───────┘        └────────┬───────┘
        │                         │                         │
        │   Amazon SP-API / Ads API / Brand Registry        │
        │                         │                         │
        └─────────────────────────┼─────────────────────────┘
                                  ▼
                          ┌──────────────┐
                          │   Finance    │ ← 모든 매출/비용 집계
                          └──────┬───────┘
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
            ┌───────────────┐        ┌────────────────┐
            │      OMS      │        │ Reimbursement  │
            │ (주문/재고)   │        │  (FBA 환급)    │
            └───────────────┘        └────────────────┘

                    ┌───────────────────────────┐
                    │     Product Planning      │ ← 모든 데이터 소비 (독립)
                    │  (UX, 경쟁사, 로드맵)     │
                    └───────────────────────────┘
```

**키 인사이트**: Product Library가 **모든 모듈의 single source of truth**. 여기 없으면 다른 모듈들이 ASIN/SKU를 각자 들고 있어 데이터 중복/불일치 발생.

---

## 2. 모듈별 구체 스코프

### 🎯 Product Library (3층, Phase 1 착수 후보)

| 기능 영역 | 페이지 | 상세 |
|---|---|---|
| **제품 카탈로그** | `/products` | SKU/ASIN 목록, 부모/자식 관계, variant |
| **에셋 라이브러리** | `/products/assets` | 이미지/영상/A+ 콘텐츠 중앙 저장소 |
| **호환성 매트릭스** | `/products/compat` | 기기 × 케이스 compatibility (iPhone 15 ↔ Mag Armor) |
| **ASIN Mapping** | `/products/mapping` | Spigen SKU ↔ Amazon ASIN × 마켓 |
| **Lifecycle** | `/products/lifecycle` | Draft / Active / Phaseout / EOL 상태 관리 |

- **DB 스키마**: `products.products`, `products.product_assets`, `products.product_compatibility`, `products.asin_mapping`
- **Amazon API**: Catalog API, Listings Items API
- **복잡도**: ⭐⭐⭐ (중)
- **예상 기간**: 3-4주 (풀스펙) / **1주 (MVP: ASIN mapping만)**

### 📝 Listing Management (4층)

| 기능 영역 | 페이지 | 상세 |
|---|---|---|
| **SEO 최적화** | `/listings/seo` | AI 제안 (title/bullet/description) |
| **Feed Upload** | `/listings/feeds` | Flat File / XML / JSON_LISTINGS_FEED |
| **가격 관리** | `/listings/pricing` | BuyBox, 경쟁사, MAP, Strikethrough |
| **콘텐츠 버전** | `/listings/versions` | 변경 이력, 롤백 |
| **A+ Content** | `/listings/aplus` | 모듈 기반 편집, 적용 상태 |

- **DB 스키마**: `listings.listings`, `listings.listing_versions`, `listings.price_history`, `listings.aplus_modules`
- **Amazon API**: Listings API v2022, Product Pricing API, Feeds API
- **복잡도**: ⭐⭐⭐⭐ (상)
- **예상 기간**: 4-6주

### 💰 Reimbursement (8층 → 3순위 추천)

| 기능 영역 | 페이지 | 상세 |
|---|---|---|
| **FBA Inventory Audit** | `/reimb/inventory` | Shipment 차액 자동 감지 |
| **Lost/Damaged Cases** | `/reimb/cases` | 자동 케이스 open + follow-up |
| **환급 추적** | `/reimb/tracking` | 기한, 금액, 상태 |
| **Policy Analyzer** | `/reimb/policy` | Amazon 환급 정책 대비 eligible 탐지 |

- **DB 스키마**: `reimb.fba_shipments`, `reimb.inventory_discrepancies`, `reimb.reimbursement_cases`
- **Amazon API**: FBA Inventory API, Finances API, Shipment Invoicing API
- **복잡도**: ⭐⭐ (중하 — 비즈니스 로직 단순)
- **예상 기간**: 2-3주
- **ROI**: 매출의 0.5~2% 자동 복구 — 빠른 ROI

### 📊 Finance (6층)

| 기능 영역 | 페이지 | 상세 |
|---|---|---|
| **수익성 대시보드** | `/finance/dashboard` | 매출/비용/순이익 (SKU × 마켓 × 월) |
| **수수료 분석** | `/finance/fees` | FBA, Referral, Storage, Long-term |
| **P&L 리포트** | `/finance/pnl` | Brand / Market / Product 드릴다운 |
| **Settlement** | `/finance/settlement` | Amazon 정산 명세 파싱/검증 |

- **DB 스키마**: `finance.settlements`, `finance.fee_transactions`, `finance.pnl_snapshots`
- **Amazon API**: Finances API, Reports API (Settlement Report)
- **복잡도**: ⭐⭐⭐ (중)
- **예상 기간**: 3-4주 (다른 모듈 데이터 집계 포함)

### 📦 OMS (7층)

| 기능 영역 | 페이지 | 상세 |
|---|---|---|
| **주문 관리** | `/oms/orders` | SKU/ASIN별 FBA/FBM 주문 |
| **재고 추적** | `/oms/inventory` | Available/Reserved/Inbound 실시간 |
| **FBA 출고** | `/oms/shipments` | Outbound (SP/MCF) 추적 |
| **Inbound** | `/oms/inbound` | FBA 입고 shipment 관리 |

- **DB 스키마**: `oms.orders`, `oms.inventory_snapshots`, `oms.shipments`, `oms.inbound_plans`
- **Amazon API**: Orders API, FBA Inventory API, Fulfillment Inbound API
- **복잡도**: ⭐⭐⭐⭐⭐ (최상 — 실시간 동기화, 다채널)
- **예상 기간**: 6-8주

### 🗺️ Product Planning (5층)

| 기능 영역 | 페이지 | 상세 |
|---|---|---|
| **UX 시뮬레이터** | `/planning/ux` | 가상 ASIN mockup → 전환율 예측 |
| **경쟁사 분석** | `/planning/competitor` | 키워드/리뷰/가격 비교 |
| **제품 로드맵** | `/planning/roadmap` | Concept → Launch 단계 관리 |
| **SOP Simulator** | `/planning/sop` | 신제품 런칭 체크리스트 |

- **DB 스키마**: `planning.concepts`, `planning.competitor_snapshots`, `planning.launch_plans`
- **Amazon API**: Search API, Product Reviews (제한적)
- **외부**: Helium10 / Jungle Scout 연동 가능
- **복잡도**: ⭐⭐⭐⭐ (상 — AI 예측 모델 필요)
- **예상 기간**: 4-6주

---

## 3. 우선순위 시나리오 3개

### 시나리오 A — 가치 최단거리 (돈 빨리 회수)

```
Reimbursement → Finance → Listing → Product Library → OMS → Planning
   (3주)         (4주)     (5주)      (3주)          (7주)   (5주)
```

- 👍 첫 모듈 3주만에 매출 1% 환급 시작
- 👎 Product Library 없이 Listing 하면 데이터 꼬임

### 시나리오 B — 데이터 기반 우선 (깔끔한 아키텍처)

```
Product Library → Listing → Reimbursement → Finance → OMS → Planning
   (3주)           (5주)       (2주)          (3주)   (7주)   (5주)
```

- 👍 모든 모듈이 깨끗한 ASIN 마스터를 참조
- 👎 첫 ROI(Reimbursement)까지 10주

### 시나리오 C — 하이브리드 ⭐ **추천**

```
Phase 1 (4주):  Product Library MVP (ASIN mapping만) + Reimbursement
Phase 2 (5주):  Listing Management
Phase 3 (4주):  Finance + Product Library 완성
Phase 4 (7주):  OMS
Phase 5 (5주):  Planning
```

- 👍 3~4주만에 Reimbursement ROI + 데이터 일관성 보장
- 👍 Product Library는 MVP부터 점진적 확장
- 👍 총 ~25주 (6개월)

---

## 4. 공통 인프라 확장 필요

AD/IP 모듈에서 이미 만들어놨지만, 새 모듈 추가 시 공통으로 쓸 것들:

| 공통 모듈 | 현재 상태 | 확장 필요 |
|---|---|---|
| `lib/amazon/sp-api/` | Orders, Reports 부분만 | Catalog, Listings, Inventory, Finances API 클라이언트 추가 |
| `modules/shared/brand-market-selector/` | 완료 | — |
| `modules/shared/org-permissions/` | 완료 | — |
| `components/ui/data-table/` | 부분 (AD 전용) | 범용 테이블 컴포넌트로 추출 |
| `lib/jobs/` | Cron 단위 | Queue (Vercel Queues) 도입 검토 — OMS 실시간 필요 |

---

## 5. 의사결정 필요 사항 (Open Questions)

| # | 이슈 | 옵션 | 추천 | 결정 |
|---|---|---|---|:---:|
| Q1 | Reimbursement — 단독 모듈 vs Finance 하위 | a) 별도 layer <br> b) Finance 산하 | **별도** (UX/담당자 다름) | ⏳ |
| Q2 | Product Library DB — 기존 `catalog` 테이블 재사용 vs 신규 | a) 재사용 <br> b) 신규 `products` 스키마 | **신규 스키마** (모듈 격리 원칙) | ⏳ |
| Q3 | OMS 실시간 요구 — SP-API polling vs webhook | a) polling (간단) <br> b) SQS notification | **Phase 1 polling, Phase 2 SQS** | ⏳ |
| Q4 | Product Planning — 자체 모듈 vs 타 모듈 하위 | a) 독립 <br> b) Library의 sub-tab | **독립** (다른 담당자 영역) | ⏳ |

---

## 6. 온보딩 패키지 상태

각 모듈 착수 시 담당 개발자에게 전달할 온보딩 패키지:

| 모듈 | 패키지 | 상태 |
|:--|:--|:--|
| AD Optimizer | `onboarding-packages/arc-ads/` | ✅ 생성됨 |
| **Product Library** | `onboarding-packages/arc-products/` | 🔨 **이 세션에서 생성 중** |
| Listing Management | `onboarding-packages/arc-listings/` | ⏳ Phase 2 시작 시 |
| Reimbursement | `onboarding-packages/arc-reimb/` | ⏳ Phase 1 병렬 시작 시 |
| Finance | `onboarding-packages/arc-finance/` | ⏳ Phase 3 |
| OMS | `onboarding-packages/arc-oms/` | ⏳ Phase 4 |
| Product Planning | `onboarding-packages/arc-planning/` | ⏳ Phase 5 |

---

## 7. 리스크 & 대응

| 리스크 | 영향 | 가능성 | 대응 |
|---|:---:|:---:|---|
| Product Library 스코프 미확정 | High | Medium | MVP(ASIN mapping)부터 시작, 점진적 확장 |
| Amazon API Rate Limit | High | High | Global rate limiter + per-profile backoff (AD 모듈 패턴 재사용) |
| 모듈 간 의존성 역전 (listings → products) | Medium | Medium | 의존성 방향은 항상 "더 기본인 모듈 → 상위 모듈". `modules/shared/` 추출 |
| OMS 실시간 동기화 복잡도 | High | High | Phase 4로 미루고, 그 전에 polling-based MVP로 시작 |
| 개발 리소스 1명 (Jayden + AI) | Medium | High | 각 모듈 MVP 우선. 풀스펙은 반드시 이터레이션 |

---

## 8. 다음 단계

1. **이 문서 리뷰 & Q1~Q4 결정** (본인)
2. **Product Library 온보딩 패키지 생성** (이 세션)
3. **`/pdca pm product-library`** — PM Agent Team으로 discovery + PRD
4. **`/pdca plan product-library`** — Plan 문서 (MVP 우선)
5. **`/pdca design product-library`** — 3 옵션 아키텍처 비교
6. **`/pdca do product-library --scope mvp`** — MVP 구현 (ASIN mapping only)

---

## 9. Version History

| Version | Date | Changes |
|---|---|---|
| 1.0 | 2026-04-10 | 초안 — 데이터 의존성, 6개 모듈 스코프, 시나리오 3개, Q1~Q4 제시 |
