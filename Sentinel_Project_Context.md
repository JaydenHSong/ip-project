# Sentinel 프로젝트 컨텍스트 (Project Context)

> **이 문서는 프로젝트의 모든 배경, 결정사항, 맥락을 담고 있습니다.**
> 새로운 Claude 세션, 팀원, 또는 외부 개발자가 이 문서를 읽으면 프로젝트를 이어갈 수 있습니다.
>
> 최종 업데이트: 2026-02-28

---

## 1. 프로젝트 개요 (Project Overview)

### 제품명
**Sentinel (센티널)** - 파수꾼

### 한 줄 요약
아마존 마켓플레이스에서 경쟁사 리스팅의 폴리시(Policy) 위반을 자동 탐지하고, 검토 후 PD(Product Detail) 페이지 신고 + BR(Brand Registry) 케이스 관리를 자동화하는 브랜드 보호 플랫폼

### 핵심 가치
- 매일 200개 이상의 리스팅을 수동 브라우징하던 업무를 자동화
- 수집과 정리를 자동화하여, 사람은 **판단과 승인에만 집중**
- 신고 프로세스를 표준화하고 이력을 추적 가능하게 만듦

---

## 2. 배경 및 현재 상황 (Background & Current State)

### 담당자 프로필
- **직무**: 시장조사/리서치 (대기업 내 브랜드 보호 팀)
- **조직 규모**: 대기업 내 부서
- **기술 역량**: 비개발자, Claude에 많이 의존할 예정
- **개발 리소스**: 본인 혼자 또는 소수 인원

### 현재 업무 프로세스 (AS-IS)
1. 아마존 웹사이트를 **직접 브라우징**하여 경쟁사 리스팅 확인
2. 각 리스팅 상세 페이지에서 **눈으로 직접** 폴리시 위반 사항 확인
3. 위반 내용을 **엑셀에 수동 정리**
4. **Product Detail 페이지** 또는 **Brand Registry**에서 신고 접수

### 현재 Pain Points
- 하루 200개 이상 리스팅을 수동 확인 → 막대한 시간 소요
- 사람의 눈으로는 모든 리스팅 커버 불가능 → 위반 사례 누락
- 담당자마다 다른 형식과 품질 → 비표준화된 신고
- 신고 이력/결과 추적 체계 없음

### 기존 시스템 분석: OMS (oms.spigen.com)

> Sentinel은 기존 **OMS (Order Management System) 내 Violation Report 기능**을 대체/발전시키는 시스템입니다.
> 기존 OMS와 Monday.com에 분산되어 있던 신고 도구를 **Sentinel 하나로 통합**합니다.

#### 기존 신고 도구 분산 현황 (AS-IS)

| 도구 | 담당 위반 유형 | 한계 |
|------|--------------|------|
| **OMS** (oms.spigen.com) | Trademark, Copyright, 기타 Policy 위반 | AI 분석 없음, 수동 판단, 템플릿 기반 수동 작성 |
| **Monday.com** | Patent (특허 침해) 전용 | 별도 관리, OMS와 데이터 연동 없음, 이력 추적 분리 |

**Sentinel 통합 효과 (TO-BE)**: OMS의 Trademark/Copyright/Policy 신고 + Monday.com의 Patent 신고를 **단일 플랫폼에서 AI 기반으로 통합 관리**

#### OMS Violation Report 기능 상세

**메인 화면 (리포트 리스트)**
- 탭 구성: All Reports / My Reports / Archived
- 테이블 컬럼: Report No, Status, Channel (US/CA 등 국기 아이콘), Violation Type, Category, ASIN, Seller Name, No of Attempt (신고 시도 횟수), Requested By, Requested Date, Last Updated Date, Closed Date, Last Edited By
- 상태 값: Submitted, Closed, Cancelled, Requested
- 부가 기능: Outdated Reports 체크박스 필터, 검색

**신고서 상세 (좌측 리스트 + 우측 슬라이드 패널)**
- 3탭 구성: Report / Files / Activity Log
- Report 탭: Violated Items (이미지+이름+ASIN), Case IDs, Case Account Assign (이메일), Category, Specify the case, Case Template (위반 유형별 신고 문구), Seller's Name, Product Detail Page URL, Explain in detail (상세 설명)
- Files 탭: 이미지 업로드 (JPG/JPEG/PNG, 15MB 제한)
- Activity Log 탭: 누가 언제 생성/수정했는지 이력

**리포트 생성 (모달)**
- 필수 필드: Violation Type, Channel (국가, 국기 아이콘), Product ASIN or URL
- 선택 필드: Note (메모)

**액션 버튼**
- Set as Submitted, Cancel Report, Close Report, Archive Report

**Settings (3탭)**
- Schedule 탭: Daily/Weekly 설정, 시간대 최대 3개 선택
- Categories 탭: 13개 제품 카테고리 관리
- Type & Templates 탭: 위반 유형별 신고 템플릿 관리

**OMS Chrome Extension**
- 아마존 상품 페이지에서 직접 위반 유형 선택 + 추가 메모 + Report 버튼으로 즉시 신고

#### OMS 위반 유형 (기존 10개)

| # | OMS 위반 유형 | 템플릿 수 |
|---|-------------|----------|
| 1 | Variation | 18 |
| 2 | Main Image | 18 |
| 3 | Wrong Category | 2 |
| 4 | Review Violation | 7 |
| 5 | Pre-announcement Listing | 3 |
| 6 | Duplicate Listing | 6 |
| 7 | Counterfeit | 1 |
| 8 | Trademark Infringement | 3 |
| 9 | Copyright Infringement | 4 |
| 10 | Other Concerns | 5 |

> 총 67개 템플릿이 위반 유형별로 미리 정의되어 있음. Sentinel에서는 AI가 이 템플릿을 참조하되, **실제 리스팅 데이터 기반으로 맞춤형 신고서를 자동 생성**

#### Spigen 제품 카테고리 (기존 OMS 13개)

| # | 카테고리 |
|---|---------|
| 1 | GPS Screen Protector Foils |
| 2 | Golf Accessories |
| 3 | Game Console Screen Protector |
| 4 | Case |
| 5 | Cell Phone Screen Protector |
| 6 | Lens Protectors |
| 7 | Auto Screen Protector |
| 8 | Auto Accessories |
| 9 | EV Screen Protector |
| 10 | EV Accessories |
| 11 | Wearable |
| 12 | Others |

> Sentinel에서도 이 카테고리를 유지하며, Campaign 설정 및 AI 분석 프롬프트에서 제품군 맥락 정보로 활용

#### OMS UX 패턴 및 Sentinel 계승/개선 포인트

| OMS 패턴 | Sentinel 계승 | Sentinel 개선 |
|---------|-------------|-------------|
| 좌측 리스트 + 우측 슬라이드 패널 | 유지 (익숙한 UX 유지) | 패널 내 AI 분석 결과 탭 추가 |
| 3탭 (Report/Files/Activity Log) | 유지 | AI Analysis 탭 추가 (4탭) |
| 수동 Case Template 선택 | 참조용으로 유지 | AI가 자동 생성, 템플릿은 참고 자료 |
| No of Attempt 컬럼 | 유지 | AI 강화 재신고 기능과 연계 |
| Channel 국기 아이콘 | 유지 | 다국가 확장 시 국가 추가 |
| Outdated Reports 필터 | 유지 | 팔로업 모니터링과 자동 연계 |
| Activity Log | 유지 | 감사 로그(F27)와 통합 강화 |

#### OMS 제약사항 (Sentinel이 해결하는 문제)

| 제약사항 | Sentinel 해결 방안 |
|---------|------------------|
| AI 분석 없음 — 사람이 모든 위반을 직접 판단 | Claude AI가 위반 판단 + 신고서 드래프트 자동 생성 |
| 수동 템플릿 선택 — 67개 템플릿 중 직접 골라 채우기 | AI가 리스팅 데이터 기반 맞춤형 신고서 자동 작성 |
| OMS + Monday.com 분리 — 특허 신고는 별도 도구 | Sentinel 하나로 통합 (Monday.com은 특허 SSOT로만 유지) |
| 자동 크롤링 없음 — 리스팅 수집은 전적으로 수동 | 키워드 캠페인 기반 자동 크롤링 + AI 필터링 |
| 신고 성공률 최적화 없음 | AI가 정책 인용, 증거 기반, 고객 피해 관점으로 최적화 |
| 팔로업 모니터링 없음 — 신고 후 결과 수동 확인 | 자동 재방문 + 변화 감지 + 인앱 알림 |
| 재신고 자동화 없음 | AI 강화 재신고서 자동 생성 (에스컬레이션 톤 조절) |

### 모니터링 대상
- **마켓플레이스**: Amazon 여러 국가 (US, UK, JP 등)
- **범위**: 키워드 검색 기반 광범위 모니터링
- **수집 정보**: 전체 (제목, 설명, 이미지, 가격, 리뷰, 셀러 정보 등)
- **빈도**: 매일

### 폴리시 위반 유형 (Policy Violation Taxonomy)

> ⚠️ **월간 업데이트 필수**: 아마존은 정책을 수시로 변경합니다. 이 목록은 **최소 월 1회** 아마존 공식 Policy 페이지를 확인하여 업데이트해야 합니다.
>
> 참조 페이지:
> - [Amazon Product Detail Page Rules](https://sellercentral.amazon.com/gp/help/G200390640)
> - [Amazon Seller Code of Conduct](https://sellercentral.amazon.com/gp/help/G1801)
> - [Report a Violation Tool](https://sellercentral.amazon.com/help/hub/reference/external/G200444420)
> - [Amazon Brand Registry](https://brandregistry.amazon.com/)
>
> 최종 확인일: 2026-02-27

#### 카테고리 1: 지식재산권 침해 (Intellectual Property Violations)

| # | 위반 유형 | 설명 | 신고 채널 |
|---|----------|------|----------|
| V01 | **상표권 침해 (Trademark Infringement)** | 허가 없이 타사 브랜드명, 로고, 상표를 리스팅에 사용. 브랜드 혼동을 유발하는 유사 명칭 포함 | Report a Violation (Brand Registry) |
| V02 | **저작권 침해 (Copyright Infringement)** | 타사의 이미지, 텍스트, 디자인을 무단으로 리스팅에 사용 | Report a Violation (Brand Registry) |
| V03 | **특허 침해 (Patent Infringement)** | 특허 등록된 제품 디자인이나 기능을 무단 복제하여 판매 | Report a Violation / Patent Evaluation Express |
| V04 | **위조품 판매 (Counterfeit Products)** | 정품을 사칭하는 가짜/모조품 판매 | Report a Violation (Brand Registry) / Project Zero |

#### 카테고리 2: 리스팅 콘텐츠 위반 (Listing Content Violations)

| # | 위반 유형 | 설명 | 탐지 방법 |
|---|----------|------|----------|
| V05 | **허위/과장 문구 (False or Misleading Claims)** | 근거 없는 효능/성능 주장. 예: "FDA Approved", "#1 Best", "Cures disease" 등 | 키워드 플래그 탐지 |
| V06 | **금지 키워드 사용 (Restricted Keywords)** | 아마존이 금지한 키워드 사용. 예: "#1 on Amazon", "Best Seller" (뱃지 없이), "Amazon's Favorite" 등 | 키워드 플래그 탐지 |
| V07 | **부정확한 상품 정보 (Inaccurate Product Information)** | 실제 상품과 다른 설명, 사양, 이미지를 게재 | 사람 확인 |
| V08 | **이미지 정책 위반 (Image Policy Violation)** | 메인 이미지 흰 배경 미준수, 텍스트/로고 삽입, 저화질 이미지 (1000px 미만) | 이미지 수집 + 사람 확인 |
| V09 | **타이틀 정책 위반 (Title Policy Violation)** | 200자 초과, 전체 대문자, 프로모션 문구 삽입, 키워드 스터핑 | 키워드 플래그 탐지 |
| V10 | **Variation 정책 위반 (Variation Abuse)** | 관련 없는 상품을 Variation으로 묶어 리뷰 공유. 2026년 2월 아마존이 자동 분리 시작 | 변동 탐지 + 사람 확인 |

#### 카테고리 3: 리뷰/평가 조작 (Review & Rating Manipulation)

| # | 위반 유형 | 설명 | 탐지 방법 |
|---|----------|------|----------|
| V11 | **리뷰 조작 (Review Manipulation)** | 인센티브 제공 대가로 긍정 리뷰 요청, 가짜 리뷰 게시 | 리뷰 패턴 분석 + 사람 확인 |
| V12 | **리뷰 하이재킹 (Review Hijacking)** | 폐기 ASIN 합병, Vine 리뷰 집계 등으로 부당하게 리뷰 풀링 | 변동 탐지 + 사람 확인 |
| V13 | **경쟁사 리뷰 악용 (Competitor Review Abuse)** | 경쟁사 제품에 허위 부정 리뷰 작성 | 리뷰 모니터링 + 사람 확인 |

#### 카테고리 4: 판매 행위 위반 (Selling Practice Violations)

| # | 위반 유형 | 설명 | 탐지 방법 |
|---|----------|------|----------|
| V14 | **비인가 판매자 (Unauthorized Sellers)** | 브랜드 승인 없이 해당 브랜드 제품을 판매 | 셀러 정보 확인 + 사람 확인 |
| V15 | **리스팅 하이재킹 (Listing Hijacking)** | 타사 리스팅에 무단으로 셀러로 참여하여 저품질/위조 제품 판매 | 셀러 목록 모니터링 |
| V16 | **가격 조작 (Price Manipulation)** | 비정상적인 가격 설정, 가격 고정 담합 | 가격 변동 탐지 |

#### 카테고리 5: 규제/안전 위반 (Regulatory & Safety Violations)

| # | 위반 유형 | 설명 | 탐지 방법 |
|---|----------|------|----------|
| V17 | **제한 상품 판매 (Restricted Products)** | 아마존이 제한한 카테고리/상품을 승인 없이 판매 | 카테고리 확인 + 사람 확인 |
| V18 | **안전 인증 미비 (Safety Compliance)** | 필수 안전 인증(CE, FCC, UL 등) 없이 판매 | 사람 확인 |
| V19 | **유통기한 위반 (Expiration Violations)** | 만료되었거나 곧 만료될 제품 판매 | 상품 정보 확인 |

#### Sentinel V01~V19 ↔ 기존 OMS 위반 유형 매핑

> Sentinel의 19개 위반 유형은 기존 OMS 10개 유형을 **확장 및 세분화**한 것입니다.
> 기존 OMS 사용자가 Sentinel으로 전환할 때 혼란을 최소화하기 위해 매핑을 명시합니다.

| Sentinel 코드 | Sentinel 위반 유형 | 기존 OMS 유형 | 비고 |
|-------------|------------------|-------------|------|
| V01 | 상표권 침해 | Trademark Infringement (3 templates) | 1:1 매핑 |
| V02 | 저작권 침해 | Copyright Infringement (4 templates) | 1:1 매핑 |
| V03 | 특허 침해 | *(Monday.com 별도 관리)* | OMS에 없었음 — Monday.com에서 이관 |
| V04 | 위조품 판매 | Counterfeit (1 template) | 1:1 매핑 |
| V05 | 허위/과장 문구 | Other Concerns 일부 | OMS에서는 기타로 분류됨 → Sentinel에서 독립 |
| V06 | 금지 키워드 사용 | Other Concerns 일부 | OMS에서는 기타로 분류됨 → Sentinel에서 독립 |
| V07 | 부정확한 상품 정보 | Other Concerns 일부 | OMS에서는 기타로 분류됨 → Sentinel에서 독립 |
| V08 | 이미지 정책 위반 | Main Image (18 templates) | 1:1 매핑 (템플릿 풍부) |
| V09 | 타이틀 정책 위반 | *(없음)* | Sentinel 신규 — 아마존 정책 강화 대응 |
| V10 | Variation 정책 위반 | Variation (18 templates) | 1:1 매핑 (Size/Color Variation 포함) |
| V11 | 리뷰 조작 | Review Violation (7 templates) | 1:1 매핑 |
| V12 | 리뷰 하이재킹 | Review Violation 일부 | OMS에서는 Review Violation에 포함 → Sentinel에서 분리 |
| V13 | 경쟁사 리뷰 악용 | *(없음)* | Sentinel 신규 |
| V14 | 비인가 판매자 | *(없음)* | Sentinel 신규 |
| V15 | 리스팅 하이재킹 | Duplicate Listing (6 templates) | OMS Duplicate ≈ Sentinel Hijacking + 중복 |
| V16 | 가격 조작 | *(없음)* | Sentinel 신규 |
| V17 | 제한 상품 판매 | Wrong Category (2 templates) | 유사 개념 — Sentinel에서 범위 확장 |
| V18 | 안전 인증 미비 | *(없음)* | Sentinel 신규 |
| V19 | 유통기한 위반 | *(없음)* | Sentinel 신규 |
| — | *(해당 없음)* | Pre-announcement Listing (3 templates) | Sentinel에서는 V07(부정확한 상품 정보) 또는 별도 판단 |

> **요약**: OMS 10개 → Sentinel 19개로 확장. 기존 OMS "Other Concerns" (5 templates)에 뭉뚱그려진 유형들을 V05, V06, V07로 세분화. Monday.com의 Patent를 V03으로 통합. Pre-announcement Listing은 V07 범주로 흡수.

#### 기존 OMS 템플릿 시스템과 Sentinel AI 신고서의 관계

> OMS에는 위반 유형별로 총 **67개 신고 템플릿**이 미리 정의되어 있습니다.
> Sentinel에서는 이 템플릿을 다음과 같이 활용합니다.

| 항목 | OMS (기존) | Sentinel (신규) |
|------|----------|---------------|
| 신고서 작성 | 사람이 템플릿 선택 → 필드 수동 입력 | **AI가 자동 생성** (템플릿 참조 + 실제 데이터 조합) |
| 템플릿 역할 | 신고서의 **주요 틀** (사람이 채움) | AI 프롬프트의 **참고 자료** (AI가 최적화) |
| 템플릿 관리 | Settings > Type & Templates | Admin이 관리 (F29), AI 프롬프트에 주입 |
| 맞춤화 | 사람이 "Explain in detail" 필드에 수동 작성 | AI가 리스팅별 구체적 증거 기반 맞춤 서술 |
| 성공률 최적화 | 없음 | AI가 승인/반려/수정 피드백을 학습하여 점진 향상 |

> **이행 전략**: 기존 67개 OMS 템플릿을 Sentinel DB에 마이그레이션하여 AI 프롬프트 컨텍스트로 활용.
> Admin은 템플릿을 수정/추가할 수 있으며, AI는 해당 템플릿 + 과거 성공 사례를 참조하여 신고서를 생성.

#### 주요 금지 키워드/문구 목록 (Restricted Keywords Reference)

탐지 시스템에서 플래그로 사용할 수 있는 금지/의심 키워드:

| 카테고리 | 금지/의심 키워드 예시 |
|---------|---------------------|
| 허위 순위 주장 | "#1 on Amazon", "Best Seller" (뱃지 없이), "Amazon's Favorite", "Top-Rated by All Users" |
| 허위 인증 주장 | "FDA Approved", "EPA Registered", "Clinically Proven" (근거 없이) |
| 과장 효능 | "Cures disease", "Kills 99.9% of Germs", "Instant Fix", "Magic Solution" |
| 비교 광고 | "Works Better Than [Brand]", "Superior to [Brand]" |
| 허위 배송 | "Fastest Shipping", "Same Day Delivery" (보장 불가 시) |
| 키워드 스터핑 | 동일 키워드 과도한 반복 (백엔드 검색어 포함) |

> ※ 이 목록은 **예시**이며 아마존의 실제 금지 키워드는 더 광범위합니다.
> ※ 카테고리별로 추가 제한 키워드가 있을 수 있습니다 (건강보조식품, 의료기기 등).

### 채널별 위반 유형 분담 (Detection Channel Assignment)

위반 유형의 특성에 따라 **자동 탐지(Crawler)**와 **수동 판단(Extension)**으로 분담합니다.

#### Crawler (자동 탐지) 담당
> 키워드/텍스트/이미지 패턴으로 **시스템이 자동 탐지 가능한** 유형

| 위반 유형 | 자동 탐지 방식 |
|----------|--------------|
| V03 특허 침해 | **Spigen 특허 레지스트리**에 등록된 특허 리스트와 리스팅 자동 비교 |
| V05 허위/과장 문구 | 금지 키워드 플래그 |
| V06 금지 키워드 사용 | 금지 키워드 리스트 매칭 |
| V07 부정확한 상품 정보 | 텍스트 패턴 + 사람 최종 확인 |
| V08 이미지 정책 위반 | 이미지 수집 + 사람 최종 확인 |
| V09 타이틀 정책 위반 | 길이/대문자/프로모션 문구 자동 체크 |
| V10 Variation 정책 위반 | 변동 탐지 + 사람 최종 확인 |

#### Extension (오퍼레이터 수동 신고) 담당
> **사람의 눈과 판단이 필요한** 유형 — 오퍼레이터가 브라우징 중 발견 시 원클릭 신고

| 위반 유형 | 수동 판단 이유 |
|----------|--------------|
| V01 상표권 침해 | 브랜드 혼동 여부는 맥락적 판단 필요 |
| V02 저작권 침해 | 이미지/텍스트 원본 확인 필요 |
| V04 위조품 판매 | 실물 비교 또는 테스트바이 필요 |
| V11 리뷰 조작 | 리뷰 패턴 분석에 사람 판단 필요 |
| V12 리뷰 하이재킹 | 리뷰 이력 맥락 판단 필요 |
| V13 경쟁사 리뷰 악용 | 리뷰 내용/패턴 맥락 판단 필요 |
| V14 비인가 판매자 | 셀러 인가 여부 내부 확인 필요 |
| V15 리스팅 하이재킹 | 셀러 목록 맥락 판단 필요 |
| V16 가격 조작 | 가격 비정상 여부 맥락 판단 필요 |
| V17 제한 상품 판매 | 카테고리별 규제 확인 필요 |
| V18 안전 인증 미비 | 인증서 존재 여부 확인 필요 |
| V19 유통기한 위반 | 상품 상세 확인 필요 |

### Spigen 등록 상표 레지스트리 (Trademark Registry)

> PDF 교육자료 "PV / IP Violation for Tesla EV" 기반.
> AI 분석 엔진이 V01(상표권 침해) 판단 시 이 목록을 참조합니다.

#### Spigen 등록 상표명 (Registered Trademarks)

| # | 상표명 | 카테고리 |
|---|--------|---------|
| 1 | Rugged Armor | 케이스 시리즈 |
| 2 | Tough Armor | 케이스 시리즈 |
| 3 | Thin Fit | 케이스 시리즈 |
| 4 | Ultra Hybrid | 케이스 시리즈 |
| 5 | Liquid Crystal | 케이스 시리즈 |
| 6 | EZ FIT | 액세서리/부착 기술 |
| 7 | Flip Armor | 케이스 시리즈 |
| 8 | Retro Fit | 케이스 시리즈 |
| 9 | Mag Fit | 케이스 시리즈 (MagSafe 호환) |
| 10 | Air Cushion | 보호 기술 |

> **TODO**: 전체 등록 상표 목록은 Spigen 법무팀/IP팀에서 확인 필요. 위 목록은 교육자료 기반 일부이며, 실제 등록 상표는 더 많을 수 있음.

#### Spigen 상표 유형 (3가지 마크 형태)

| 마크 유형 | 설명 | AI 탐지 방법 |
|---------|------|-------------|
| **Design Mark** | 로고/도형 상표 (시각적 디자인) | Claude Vision 이미지 분석으로 유사 로고 탐지 |
| **Standard Character** | 문자열 상표 (텍스트 기반) | 리스팅 텍스트에서 키워드 매칭 |
| **Character Logo** | 문자+디자인 결합 상표 | 이미지 + 텍스트 복합 분석 |

#### AI 상표 침해 탐지 활용 방법

1. **텍스트 매칭**: 리스팅 제목/설명/Bullet Points에서 Spigen 등록 상표명 검출
2. **이미지 분석**: Claude Vision으로 리스팅 이미지에서 Spigen 로고/디자인 마크 유사도 판단
3. **변형 탐지**: 상표명 변형 사용 탐지 (예: "Rugged Armour", "ToughArmor", "Thin-Fit" 등 의도적 변형)
4. **맥락 판단**: 단순 언급(호환성 표기)과 침해(브랜드 사칭) 구분 — AI가 문맥 기반 판단

> 등록 상표 목록은 Admin이 Sentinel Web Settings에서 관리 (추가/수정/삭제).
> 상표 데이터 변경 시 AI 프롬프트에 자동 반영.

### Spigen 특허 레지스트리 (Patent Registry)

특허 데이터는 **Monday.com**에서 관리 (Single Source of Truth)하며, API를 통해 Sentinel로 자동 동기화합니다.

#### Monday.com → Sentinel 연동 스펙

| 항목 | 설명 |
|------|------|
| **데이터 소스** | Monday.com 특허 관리 보드 |
| **동기화 방향** | **단방향** (Monday → Sentinel 읽기만) |
| **동기화 빈도** | **하루 1회** (스케줄 기반, cron job) |
| **API** | Monday.com GraphQL API (`https://api.monday.com/v2`) |
| **인증** | Monday.com API Token (Admin 설정) |
| **수동 트리거** | Admin이 Sentinel Web에서 즉시 동기화 버튼 가능 |

#### 동기화 흐름

```
Monday.com (특허 관리 보드)
    ↓  GraphQL API (하루 1회 자동)
Sentinel DB (특허 레지스트리 테이블)
    ↓  크롤링된 리스팅과 자동 비교
의심 리스팅 플래그 → 신고 대기열
```

#### 특허 레지스트리 예상 필드 (Monday 보드 확인 후 확정)

| 필드 | 설명 | Monday 컬럼 매핑 |
|------|------|------------------|
| 특허 번호 | 등록 번호 | TBD |
| 특허명 | 특허 이름/제목 | TBD |
| 관련 키워드/특징 | 크롤링 비교용 키워드 | TBD |
| 특허 이미지 | 디자인 특허 등 시각적 비교용 | TBD |
| 등록국 | US, KR, JP 등 | TBD |
| 만료일 | 특허 유효기간 | TBD |
| 상태 | 활성/만료/출원 중 | TBD |

> **TODO**: Monday.com 특허 보드의 실제 구조(보드 ID, 컬럼 구성)를 확인하여 필드 매핑 확정 필요

#### 관리 권한
- Admin만 동기화 설정 (API Token, 보드 ID, 매핑) 변경 가능
- 동기화 성공/실패 로그 및 알림 제공
- Sentinel에서 특허 데이터 **수정 불가** (Monday.com에서만 수정)

### AI 분석 엔진 (Claude API Integration)

크롤링된 리스팅 데이터를 **Claude API (Opus)**에 전송하여 위반 여부를 자동 판단하고, 신고서 드래프트까지 자동 작성하는 기능

#### AI의 역할
- **AI가 위반 판단까지 수행**, 사람(Editor/Admin)은 **승인만** 담당
- 기존: 키워드 플래그 → 사람이 판단 → 사람이 신고서 작성
- 변경: 키워드 플래그 + **AI가 판단 + 신고서 작성** → 사람은 승인만

#### AI 분석 기반 지식 체계

> AI 분석 엔진이 참조하는 2가지 핵심 지식: **Amazon Policy 5가지** + **Spigen IP 3대 축**

**Amazon Policy 5가지 (AI 프롬프트 내장)**

| # | 정책 | 핵심 규칙 | 관련 Sentinel 위반 유형 |
|---|------|----------|----------------------|
| 1 | Main Image | 흰색 배경, 판매 제품만 표시, 텍스트/워터마크/그래픽 금지 | V08 |
| 2 | Variation | 관련 제품만 묶기 (Size/Color), 무관한 제품 조합 금지 | V10 |
| 3 | Category | 올바른 카테고리에 등록 | V17 |
| 4 | Listing Activation Date | 디바이스 공식 발표 후에만 리스팅 활성화 | V07 (Pre-announcement) |
| 5 | Product Review | 진실된 고객 경험만, 조작/인센티브 금지 | V11, V12, V13 |

**Spigen IP 3대 축 (AI 프롬프트 내장)**

| # | IP 유형 | 설명 | AI 탐지 방법 | 데이터 소스 |
|---|--------|------|-------------|-----------|
| 1 | **Trademark** (상표) | Spigen 등록 상표명 + 3가지 마크 형태 | 텍스트 매칭 + 이미지 분석 | Sentinel 상표 레지스트리 (Settings) |
| 2 | **Image Copyright** (이미지 저작권) | Spigen 웹사이트 제품 이미지 저작권 | Claude Vision 이미지 유사도 비교 | Spigen 공식 이미지 DB (향후 구축) |
| 3 | **Patent** (특허) | Design Patent + Utility Patent | 특허 레지스트리 대비 유사도 분석 | Monday.com 동기화 |

> PDF 교육자료 "PV / IP Violation for Tesla EV" 기반 정리.
> 실제 위반 사례: Main Image에 차량 이미지 포함, Size/Color Variation으로 무관 제품 묶기, 미출시 제품에 리뷰 존재, AliExpress에서 Spigen 비디오 무단 사용, "Essential Storage" 등 상표 침해 등

#### AI 분석 영역 (3가지)

| # | 영역 | 입력 데이터 | AI 분석 내용 | 출력 |
|---|------|-----------|-------------|------|
| 1 | **이미지 위반 확인** | 리스팅 이미지 (메인/서브) | Spigen 로고/이미지 무단 사용 여부, 이미지 내 금지 텍스트, 이미지 정책 위반 (흰 배경, 텍스트 오버레이 등) | 위반 여부 + 근거 설명 |
| 2 | **특허 침해 유사도 판단** | 리스팅 제목/설명/이미지 + Spigen 특허 레지스트리 | 등록된 특허(Design/Utility)와 리스팅 제품의 유사도 분석 | 유사도 점수 + 침해 근거 |
| 3 | **신고서 드래프트 자동 작성** | 위반 분석 결과 + 리스팅 데이터 + 기존 OMS 템플릿(67개) + 성공 사례 | PD Reporting + BR 케이스 양식에 맞는 신고서 생성 | 제출 가능한 신고서 드래프트 |

#### AI 신고서 작성 전략 (Outcome-Driven Case Writing)

> **핵심 목표**: 단순 위반 보고가 아닌, **아마존이 실제로 리스팅을 수정/제거하게 만드는** 설득력 있는 신고서 작성

AI가 신고서를 작성할 때 다음 원칙을 따릅니다:

**1. 아마존 정책 직접 인용**
- 위반 사항이 아마존의 어떤 정책 조항을 어기는지 **구체적으로 명시**
- 예: "Amazon Product Detail Page Rules (G200390640) Section 3.2 위반"
- 모호한 표현 대신 정책 코드/URL 포함

**2. 구체적 증거 기반 서술**
- 위반 위치를 **정확히 지정** (예: "타이틀 3번째 단어", "Bullet Point #2", "메인 이미지")
- 스크린샷 + 텍스트 증거를 함께 제시
- ASIN, 셀러 정보, 위반 발생 일시 등 구체적 데이터 포함

**3. 고객 피해 관점 강조**
- 아마존은 **고객 보호**를 최우선으로 하므로, 해당 위반이 고객에게 미치는 영향 서술
- 예: "허위 FDA Approved 문구로 인해 고객이 미인증 제품을 의료 목적으로 구매할 위험"

**4. IP 권리 소유 증명 포함**
- 특허/상표 등록 번호, 등록국, 등록일 자동 삽입 (Monday.com 데이터 활용)
- Brand Registry 연결 정보 포함

**5. 재신고 시 에스컬레이션 전략**
- 1차 신고가 거부/무응답 시 → AI가 **이전 케이스 이력 + 추가 증거**를 포함하여 강화된 신고서 재작성
- 미해결 기간, 반복 위반 패턴, 고객 피해 누적 등 추가 논거
- 필요 시 에스컬레이션 톤 조절 (일반 → 긴급 → 법적 조치 암시)

**6. 위반 유형별 맞춤 템플릿**
- 각 위반 유형(V01~V19)별로 최적화된 신고서 템플릿 구비
- AI가 템플릿 + 실제 데이터를 조합하여 드래프트 생성
- 성공/실패 이력을 학습하여 **점진적으로 성공률 향상**

#### 동작 흐름

```
[입력 채널 3개 → 이후 동일 파이프라인]

채널 1: 크롤러 (자동 수집)    채널 2: 익스텐션 (수동 제보)    채널 3: 웹 수동 기입
  - 캠페인 기반 자동 크롤링     - 오퍼레이터 원클릭 제보        - Admin/Editor가 직접
  - 1~5페이지 리스팅 수집       - 위반 유형 + 메모/스크린샷      - ASIN + 위반유형 입력
           ↓                           ↓                           ↓
           └──────────────── 통합 신고 파이프라인 ──────────────────┘
                                     ↓
                   Sonnet API 호출 (Skill 참조 + 이미지 + 텍스트 + 특허 데이터)
                                     ↓
                   AI 분석 결과:
                     - 위반 유형 판정 + 근거
                     - 위반 심각도 (High/Medium/Low) + AI 확신도 (0~100)
                     - 신고서 드래프트 자동 생성 (Skill 기반 성공률 최적화)
                                     ↓
                   Auto-approve 체크 (위반유형별 설정 + AI 확신도 임계값)
                     ├─ ON + 임계값 충족 → 바로 PD Reporting + BR 제출
                     └─ OFF 또는 미충족 → Report Queue로
                                     ↓
                   Editor/Admin: 드래프트 확인 & 인라인 편집
                                     ↓
                     ├─ [Approve] → PD Reporting (Extension) + BR 케이스 제출
                     └─ [Re-write] → 피드백 입력 → AI 재작성 → 다시 확인
                                     ↓
                   승인 시 수정 이력 → Opus가 Skill 업데이트 (AI 학습)
                                     ↓
                   Pending: AI 모니터링 (매 N일 재방문 + 스크린샷 + AI 리마크)
                     ├─ 위반 해결됨 → AI 리뷰 후 Done ✅
                     ├─ 부분 수정 → 리마크 + 계속 Pending
                     └─ 장기 미해결 → AI 강화 재신고서 작성
```

> **핵심**: 크롤러/익스텐션/웹 수동기입 어디서 들어오든 AI 분석 → 드래프트 → 승인 → 팔로업 흐름은 **100% 동일**

#### 기술 스펙: Teacher-Student AI 아키텍처

> **핵심 원칙**: Opus(Teacher)가 학습 → Skill 업데이트 → Sonnet(Worker)이 Skill 참조하여 드래프트 작성 → Haiku(Monitor)가 단순 비교 모니터링. 시간이 지날수록 Skill 성숙 → 품질 향상 + 비용 감소.

**모델별 역할 분담**

| 모델 | 역할 | 담당 업무 | 호출 빈도 |
|------|------|----------|----------|
| **Opus** (Teacher) | AI 학습 전담 | 에디터 수정 diff 분석 → 패턴 추출 → Skill 문서 업데이트 | 수정된 건만 (~60%) |
| **Sonnet** (Worker) | 드래프트 작성 | Skill 참조 + 리스팅 데이터 → 고품질 드래프트/Re-write 생성 | 매 건 (100%) |
| **Haiku** (Monitor) | 모니터링 | 스크린샷 비교 + 변화 감지 + 리마크 작성 | 모니터링 주기마다 |

**Skill 시스템 (위반유형별 학습 문서)**

```
skills/
├─ V01-trademark.md       ← Opus가 업데이트, Sonnet이 참조
├─ V05-counterfeit.md
├─ V08-image-policy.md
├─ V12-patent.md
└─ ...

예: V01-trademark.md
─────────────────────────
## 톤 & 스타일
- "unauthorized use" 대신 "infringement" 사용
- 첫 문장에 상표 등록번호 명시

## 증거 구성 순서
1. 상표 등록 정보
2. 침해 스크린샷 + 해당 부분 인용
3. 소비자 혼동 가능성 설명

## 에디터 선호 패턴
- ❌ "We believe this is a violation"
- ✅ "This listing clearly infringes Spigen's registered trademark #XXXXX"

## 자주 수정되는 부분
- 결론 문단: 조치 요청을 구체적으로 (삭제 vs 수정 명시)
─────────────────────────
```

**Teacher-Student 학습 흐름**

```
1. Sonnet이 Skill(V01) 참조 → 드래프트 생성
2. 에디터가 검토 & 수정
3. Opus가 수정 diff 분석:
   ├─ "결론 문단을 더 강하게 바꿨네"
   ├─ "증거 순서를 바꿨네"
   └─ Skill(V01) 업데이트
4. 다음 V01 신고 시 → Sonnet이 업데이트된 Skill 참조
   → 점점 수정 빈도 ↓ → Auto-approve 비율 ↑ → 비용 ↓
```

**Skill 성숙도에 따른 비용 변화**

| 시기 | Re-write 비율 | Opus 호출 비율 | 건당 비용 |
|------|:------------:|:------------:|--------:|
| 초기 (Skill 미성숙) | 30% | 60% | ~$0.09 |
| 3개월 후 | 10% | 30% | ~$0.06 |
| 6개월 후 | 5% | 15% | ~$0.05 |

**API 기본 정보**

| 항목 | 설명 |
|------|------|
| API | Anthropic Messages API |
| 드래프트/Re-write 모델 | Sonnet (`claude-sonnet-4-6`) — Skill 참조하여 작성 |
| 학습 모델 | Opus (`claude-opus-4-6`) — 수정 diff 분석 + Skill 업데이트 |
| 모니터링 모델 | Haiku (`claude-haiku-4-5`) — 스크린샷 비교 + 리마크 |
| 입력 | 텍스트 (제목/설명/셀러 정보) + 이미지 (base64) + 특허 데이터 + Skill 문서 |
| Vision | Claude Vision으로 이미지 분석 (로고 탐지, 텍스트 인식, 모니터링 스크린샷 비교) |
| 프롬프트 | Skill 문서 + 위반 유형별 분석 프롬프트 + Spigen 브랜드 가이드라인 + 아마존 정책 규칙 |
| 출력 형식 | 구조화된 JSON (위반 여부, 유형, 근거, 심각도, 드래프트) |
| 비용 관리 | 의심 리스팅에만 AI 호출, Prompt Caching (시스템 프롬프트), Batch API (모니터링) |

#### AI 판단 신뢰도 관리
- AI 판단에 **심각도 점수** 부여 (High/Medium/Low)
- High: AI 확신도 높음 → 빠른 승인 권장
- Medium: 검토 필요 → Editor 상세 확인
- Low: AI 불확실 → 수동 판단 권장
- AI 판단 정확도를 지속적으로 모니터링 (승인/반려 비율 추적)

#### AI vs 사용자 위반 판단 불일치 처리 (Disagreement Handling)

> Extension 경유 신고에서 오퍼레이터가 선택한 위반 유형과 AI가 판정한 위반 유형이 다를 수 있습니다.
> 이 불일치를 투명하게 표시하고, Editor/Admin이 최종 확정하는 워크플로우입니다.

**Report 필드 구조 (위반 유형 관련)**

| 필드명 | 설명 | 설정 시점 |
|--------|------|----------|
| `user_violation_type` | 오퍼레이터/크롤러가 지정한 위반 유형 (Extension: 오퍼레이터 선택, Crawler: 시스템 판단) | 신고 요청 시 |
| `ai_violation_type` | AI(Claude)가 판정한 위반 유형 | AI 분석 완료 시 |
| `ai_confidence` | AI 판정 신뢰도 (0~100) | AI 분석 완료 시 |
| `confirmed_violation_type` | Editor/Admin이 최종 확정한 위반 유형 | 승인 시 |
| `disagreement_flag` | user_violation_type != ai_violation_type 여부 (boolean) | AI 분석 완료 시 자동 계산 |

**불일치 시 UI 표시**
- 신고 대기열 리스트에 **"의견 불일치" 배지** 표시 (시각적으로 눈에 띄게)
- 불일치 건은 리뷰 우선순위 **자동 상향** (Editor에게 우선 표시)
- 신고서 상세 패널에서 사용자 판단 vs AI 판단 **나란히 비교** 표시
- AI가 왜 다른 유형으로 판정했는지 **근거 설명** 함께 표시

**리뷰 워크플로우**
```
Extension/Crawler → 위반 유형 지정 (user_violation_type)
    ↓
AI 분석 → 위반 유형 판정 (ai_violation_type + ai_confidence)
    ↓
일치 여부 자동 판별 → disagreement_flag 설정
    ↓
[일치] → 일반 리뷰 큐에 등록
[불일치] → 우선 리뷰 큐에 등록 + "의견 불일치" 배지
    ↓
Editor/Admin 리뷰:
  - 사용자 의견 채택 → confirmed = user_violation_type
  - AI 의견 채택 → confirmed = ai_violation_type
  - 제3의 판단 → confirmed = 별도 유형 선택
    ↓
confirmed_violation_type 확정 → 신고서 드래프트에 반영
```

**불일치 데이터 활용**
- 불일치 패턴 분석: 어떤 위반 유형에서 불일치가 많은지 추적 → AI 프롬프트 개선 트리거
- 사용자별 판단 정확도 추적: confirmed와 user/ai 중 어느 쪽이 더 자주 채택되는지 통계
- 대시보드에서 불일치율 모니터링 (전체, 위반 유형별, 사용자별)

#### AI 피드백 학습 (Human Feedback Loop) — Teacher-Student 모델

> **핵심**: Editor 수정 이력을 **Opus(Teacher)**가 분석하여 위반유형별 **Skill 문서**를 업데이트. 이후 **Sonnet(Worker)**이 Skill을 참조하여 드래프트 품질을 점진적으로 향상.

**1. Re-write 피드백 학습**
- **Re-write 시 피드백 저장**: Editor가 [Re-write] 클릭 시 입력한 피드백(예: "증거 더 보강", "톤 더 강하게")을 DB에 기록
- **Sonnet이 피드백 반영하여 재작성**: 피드백 + 원본 드래프트 + Skill → 개선된 드래프트 생성
- **Re-write 패턴 분석**: 위반 유형별로 Re-write 사유를 카테고리화 → Opus가 Skill 개선 포인트로 반영
- **Re-write율 모니터링**: 위반 유형별 Re-write율 추적 → 특정 유형의 Re-write율이 높으면 해당 Skill 집중 개선

**2. 수정본 학습 (Edit Feedback) → Skill 업데이트**
- **원본 vs 수정본 diff 저장**: Editor/Admin이 AI 드래프트를 직접 수정 후 승인할 때, 원본 AI 드래프트와 최종 수정본의 diff를 DB에 기록
- **Opus(Teacher)가 diff 분석**: 수정 패턴 추출 (예: "증거 서술 방식 변경", "정책 인용 추가", "톤 조절")
- **Skill 문서 자동 업데이트**: Opus가 분석 결과를 해당 위반유형 Skill 문서에 반영 (에디터 선호 패턴, 자주 수정되는 부분 등)
- **성공한 수정본 우선 참조**: 수정 후 제출 → Done이 된(Resolved) 케이스의 수정본을 "성공 사례"로 Skill에 우선 반영

**3. 승인/Re-write/수정 비율 대시보드**
- 위반 유형별 그대로 승인 / 수정 후 승인 / Re-write 비율 추적
- "그대로 승인" 비율이 높아질수록 Skill 성숙도 및 AI 품질 향상의 지표
- Auto-approve 대상 위반유형 확대 판단 근거로 활용

#### AI 장애 시 Fallback 전략
- Claude API 장애/타임아웃 시 → 신고 대기열에 "AI 분석 실패" 상태로 등록, Editor가 수동 드래프트 작성 가능
- Rate Limit 초과 시 → BullMQ 큐에 재시도 예약 (exponential backoff)
- AI 응답이 예상 JSON 스키마에 맞지 않을 시 → 응답 폐기 후 재시도 (최대 3회), 실패 시 수동 전환

#### AI 응답 검증
- Claude API 응답을 **JSON 스키마 검증** 후에만 DB에 저장
- 허용 값 범위 체크: 위반 유형(V01~V19만), 심각도(High/Medium/Low만), 신뢰도 점수(0~100)
- 비정상 응답(빈 값, 필수 필드 누락) 필터링

#### 프롬프트 인젝션 방어
- 리스팅 텍스트(제목, 설명 등)는 **사용자 입력으로 취급** → 시스템 프롬프트와 분리
- 입력 새니타이징: 리스팅 텍스트에서 프롬프트 조작 시도 패턴 필터링
- 출력 검증: AI 응답이 예상 범위를 벗어나면 폐기

### 버전 관리 로그 (Changelog)

시스템 변경 이력을 사용자에게 투명하게 공개하는 기능

#### 표시 위치
- **Changelog 전용 페이지**: Sentinel Web 내 별도 페이지 (전체 이력 열람)
- **로그인 후 팝업/배너**: 마지막 접속 이후 새 변경사항이 있으면 알림

#### 포함 내용

| 카테고리 | 태그 | 예시 |
|---------|------|------|
| 신규 기능 추가 | `🚀 New` | "키워드 캠페인 다국가 지원 추가" |
| 버그 수정 | `🐛 Fix` | "특정 ASIN 크롤링 실패 문제 수정" |
| 위반 유형/정책 업데이트 | `📋 Policy` | "V10 Variation 정책 위반 기준 업데이트 (2026.03 아마존 정책 변경 반영)" |
| AI 분석 개선 | `🤖 AI` | "이미지 위반 탐지 정확도 개선, 신고서 드래프트 템플릿 v2 적용" |

#### 관리 권한
- Admin만 Changelog 항목 작성/수정/삭제 가능
- 모든 사용자 (Viewer 포함) 열람 가능

### 신고 후 팔로업 모니터링 (Post-Report Follow-up)

> **핵심**: 아마존은 신고 결과를 통보하지 않음. 크롤러가 주기적으로 리스팅을 재방문하고, **AI가 스크린샷을 분석하여 변화를 판단**하는 능동적 모니터링 시스템.
> 상세 기술 스펙은 "신고 상태 라이프사이클 > Pending 모니터링 상세" 참조.

#### 감지 대상 변화

| 상태 | 설명 | 감지 방식 |
|------|------|----------|
| ✅ **리스팅 삭제/비활성화** | 리스팅이 완전히 사라지거나 비활성화됨 | 페이지 404 또는 "현재 이용 불가" 감지 |
| ✅ **위반 내용 수정됨** | 신고한 텍스트/이미지/타이틀 등이 변경됨 | AI가 스크린샷 비교 + 리마크 작성 |
| ✅ **셀러 변경/제거** | 신고한 셀러가 리스팅에서 제거됨 | 셀러 목록 비교 |
| ⚠️ **아무 변화 없음** | 설정 기간 경과 후에도 변화 없음 | 재확인 주기(기본 7일, Settings에서 변경 가능) 후 AI 리마크 |

#### 동작 흐름

```
신고 승인 → Submitted → Pending 진입
    ↓
팔로업 모니터링 큐에 자동 등록
    ↓
매 N일마다 크롤러 재방문 (N = Settings 재확인 주기, 기본 7일)
    ↓
재방문 시:
  1. 스크린샷 캡처 (Playwright, 1280x800)
  2. AI(Haiku) 분석: 이전 vs 현재 스크린샷 비교
  3. 위반 영역 좌표 + 리마크 JSON 생성
  4. 원본 + 좌표 데이터 저장
    ↓
AI 판단:
  ├─ 위반 해결됨 → Done ✅ (AI 리마크 + 스크린샷 증거)
  ├─ 부분 수정 → 리마크 + 계속 Pending (N일 후 재확인)
  └─ 변화 없음 → AI 주간 리마크 + 재신고 제안
    ↓
장기 미해결 → AI 강화 재신고서 자동 생성 (에스컬레이션 톤)
```

#### 신고 상태 라이프사이클

```
Draft (AI 드래프트 생성 완료)
  → Auto-approve 체크
    ├─ ON + 임계값 충족 → Submitted (자동 제출)
    └─ OFF → Review (검토 대기)
  → Review (Editor/Admin 확인 중)
    ├─ [Approve] → Submitted (신고 접수)
    ├─ [Re-write] → AI 재작성 (피드백 반영) → Draft로 회귀
    └─ [Cancel] → Cancelled (오탐 확정)
  → Submitted (Seller Central 케이스 오픈)
    → Pending (아마존 처리 대기 — AI 능동 모니터링)
      ├─ 매 N일마다 크롤러 재방문 (N = Settings 설정값, 기본 7일)
      ├─ 재방문 시: 스크린샷 캡처 → AI 리뷰 → 리마크 작성
      ├─ 변화 감지 (수정/삭제) → AI가 판단:
      │   ├─ 위반 해결됨 → Done ✅
      │   └─ 부분 수정, 아직 위반 → 리마크 + 계속 Pending
      ├─ 변화 없음 + N일 경과 → AI 주간 리마크 + 계속 모니터링
      └─ 장기 미해결 → AI 강화 재신고 Draft 자동 생성
        → Re-submitted (재신고)
        → Escalated (에스컬레이션)
  → Done (최종 해결)
  → Cancelled (취소 — 최종 상태, 복구 불가)
```

> **핵심 변경 사항**:
> - **Rejected(반려) 제거** → Re-write로 대체 (AI가 피드백 반영하여 재작성)
> - **Pending = AI 능동 모니터링** (단순 대기가 아님, 아마존은 결과를 알려주지 않음)
> - **Done**: 크롤러 재방문 → AI가 리스팅 변화 확인 → 해결 판단 시 Done
> - **Auto-approve**: 위반유형별 ON/OFF + AI 확신도 임계값 조건 충족 시 자동 제출

#### Pending 모니터링 상세 (AI + 스크린샷)

> 아마존은 신고 결과를 별도 통보하지 않음. 크롤러가 주기적으로 리스팅을 재방문하여 변화를 감지하고, AI가 분석하여 리마크를 남기는 방식.

**모니터링 설정 (Settings 페이지에서 관리)**

| 설정 항목 | 기본값 | 설명 |
|----------|:-----:|------|
| 재확인 주기 | 7일 | 크롤러 재방문 간격 (Admin 변경 가능) |
| 최대 모니터링 기간 | 90일 | 이후 Unresolved 확정 + 재신고 제안 |

**재방문 시 수행 작업**

```
크롤러 재방문
  ├─ 1. Playwright로 리스팅 페이지 스크린샷 캡처 (1280x800)
  ├─ 2. 스크린샷 → Supabase Storage 저장 (monitoring/{report_id}/{timestamp}.png)
  ├─ 3. Haiku Vision API로 현재 vs 이전 스크린샷 비교 분석
  ├─ 4. AI가 위반 영역 좌표 + 리마크 JSON 반환
  │     [
  │       { x: 340, y: 120, w: 200, h: 50, remark: "상표 무단 사용 — 변화 없음" },
  │       { x: 100, y: 400, w: 300, h: 80, remark: "허위 호환성 표시 — 문구 삭제됨" }
  │     ]
  └─ 5. 원본 스크린샷 + 좌표 데이터 DB 저장 → UI에서 CSS 오버레이로 마킹 표시
```

**스크린샷 마킹 방식: UI 오버레이 (원본 보존)**

- 원본 스크린샷은 그대로 저장 (증거 무결성 보존)
- AI가 위반 의심 영역 좌표 + 리마크를 JSON으로 반환 → DB 저장
- UI에서 원본 위에 CSS 오버레이로 빨간 원/박스 + 라벨 표시
- Admin이 [원본 보기] / [마킹 토글] 전환 가능
- 리마크 호버 시 상세 설명 팝업

**모니터링 타임라인 UI (Admin 열람)**

```
Report #R-0042 — Pending
──────────────────────────────────────

📸 Day 7 (2026-03-07)
   [스크린샷 썸네일 + AI 마킹 오버레이]
   🔴 #1 "타이틀에 'Spigen' 상표 무단 사용 — 변화 없음"
   🔴 #2 "Bullet Point에 허위 호환성 표시 — 변화 없음"
   AI 리마크: "리스팅 여전히 활성. 위반 내용 변화 없음."

📸 Day 14 (2026-03-14)
   [스크린샷 + 마킹]
   🔴 #1 "타이틀에서 'Spigen' 제거됨 ✅"
   🔴 #2 "호환성 표시 문구 여전히 존재"
   AI 리마크: "타이틀 수정됨. Bullet Point 위반은 미해결. 부분 수정."

📸 Day 21 (2026-03-21)
   [스크린샷]
   AI 리마크: "리스팅 삭제 확인 (404). 위반 해결됨."
   → Status: Done ✅
```

**스크린샷 저장 정책**

| 항목 | 설정 |
|------|------|
| 저장 경로 | `monitoring/{report_id}/{timestamp}.png` |
| 저장소 | Supabase Storage |
| 해상도 | 1280x800 (용량 최적화) |
| 보존 기간 | Done 후 90일 자동 삭제 |

#### 알림 방식
- **Sentinel Web 내 인앱 알림만** (이메일 알림 없음)
- 알림 센터에서 전체 팔로업 현황 일괄 확인
- 신고 상세 페이지에서 변화 이력 (before/after diff) 확인 가능

---

- **위반 판단은 AI(Claude)가 자동 수행**, 사람은 승인만 담당
- **시스템은 수집/분석/판단/신고서 작성을 자동화**하고, 사람은 최종 승인만 담당
- **신고 채널**: PD(Product Detail) 페이지 신고 + BR(Brand Registry) 케이스
- **최종 목표**: 승인 버튼 → 자동 신고 접수까지 완전 자동화

### 인증 및 권한 (Authentication & Authorization)
- **인증 방식**: Google OAuth (@spigen.com 도메인 한정)
- **가입**: @spigen.com 구글 계정으로 즉시 가입/로그인 가능
- **기본 권한**: 가입 시 Viewer (읽기 전용)로 자동 배정
- **권한 레벨 3단계**:

| 역할 | 권한 | 대상 사용자 |
|------|------|------------|
| **Admin** | 모든 권한 (설정, 사용자 관리, 권한 변경, 승인, 읽기/쓰기) | 시스템 관리자 |
| **Editor** | 신고 드래프트 작성/수정, 승인 버튼 클릭, 읽기 | 매니저, 오퍼레이터 |
| **Viewer** | 읽기 전용 (대시보드, 리포트, 신고 이력 열람만) | 브랜드 보호 담당자, 경영진 |

- **권한 변경**: Admin만 다른 사용자의 권한 레벨을 변경 가능

### AI API 비용 추정 (Claude API)

> 일일 100건 신고 기준. Teacher-Student 모델(Opus+Sonnet+Haiku) 적용.

#### 건당 토큰 사용량

| 단계 | 모델 | 빈도 | Input 토큰 | Output 토큰 |
|------|------|:----:|--------:|--------:|
| 드래프트 생성 | Sonnet | 100% | 8,000 | 800 |
| Re-write | Sonnet | 30% | 7,000 | 800 |
| AI 학습 (Skill 업데이트) | Opus | 60% | 2,000 | 200 |
| 모니터링 1회 (스크린샷 비교) | Haiku | 100% × 3회 | 4,200 | 400 |

#### 건당 비용

| 단계 | 건당 비용 |
|------|--------:|
| 드래프트 생성 (Sonnet) | $0.036 |
| Re-write 30% (Sonnet) | $0.010 |
| AI 학습 60% (Opus) | $0.030 |
| 모니터링 × 3회 (Haiku) | $0.015 |
| **건당 합계** | **$0.09** |

#### 월간 비용 시뮬레이션 (일 100건 = 월 3,000건)

| 시기 | 건당 | 월 비용 | 비고 |
|------|-----:|-------:|------|
| 초기 (Skill 미성숙) | $0.09 | $270 | Re-write 30%, 학습 60% |
| 3개월 후 | $0.06 | $180 | Re-write 10%, 학습 30% |
| 6개월 후 | $0.05 | $150 | Auto-approve 증가, 학습 15% |

> **추가 절감 옵션**: Prompt Caching (시스템 프롬프트 ~90% 절감) + Batch API (모니터링 50% 할인) 적용 시 월 ~$120까지 가능

### Chrome Extension 배포
- **구글 웹스토어 미등록** (사내 전용)
- **배포 방식**: .crx 파일 직접 배포 (Side-loading)
- **설치 대상**: 아마존 오퍼레이터 20명+
- **업데이트**: 새 버전 .crx 파일 재배포

---

## 3. 제품 구성 (Product Architecture)

### 3개 핵심 컴포넌트

```
┌─────────────────┐     ┌─────────────────┐
│ Sentinel Crawler │     │Sentinel Extension│
│ (자동 크롤러)     │     │ (크롬 익스텐션)   │
│                 │     │                 │
│ 백그라운드 자동   │     │ 오퍼레이터 20명+  │
│ 키워드→리스팅 수집 │     │ 원클릭 신고 요청  │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     ▼
          ┌─────────────────────┐
          │   Sentinel Web      │
          │ (신고 관리 웹사이트)   │
          │                     │
          │ • 신고 대기열 관리     │
          │ • 드래프트 자동 생성   │
          │ • 검토/승인 워크플로우  │
          │ • 승인→자동 신고 접수  │
          │ • 대시보드 & 리포트    │
          │                     │
          │ 매니저/분석가/경영진   │
          │ 5명 이하             │
          └─────────────────────┘
```

### 컴포넌트별 상세

#### Sentinel Crawler (자동 크롤러)
- 브라우저 자동화 기반 (Puppeteer/Playwright)
- 사람처럼 행동하여 아마존 Anti-bot 회피 (랜덤 딜레이, 마우스 무브먼트, 스크롤 패턴)
- 프록시 로테이션 및 Fingerprint 랜덤화
- 다국가 지원: amazon.com, amazon.co.uk, amazon.co.jp 등
- 수집 데이터: 제목, 설명, 이미지, 가격, 리뷰, 셀러 정보 전체
- 스케줄링: 키워드별 주기적 자동 실행

#### Sentinel Extension (크롬 익스텐션)
- **구글 웹스토어 미등록** - .crx 파일로 사내 직접 배포 (Side-loading)
- 아마존 상품 페이지에서 활성화되는 플로팅 버튼
- 원클릭으로 현재 페이지 정보 자동 캡처 (DOM 파싱)
- 위반 유형 선택 UI 및 메모 입력
- 스크린샷 자동 캡처 (증거 보존)
- Sentinel Web API 연동 (신고 요청 전송)

**OMS Extension → Sentinel Extension 진화 포인트**

| 기능 | OMS Extension (기존) | Sentinel Extension (신규) |
|------|---------------------|--------------------------|
| 위반 유형 선택 | OMS 10개 유형 드롭다운 | Sentinel 19개 유형 (카테고리별 그룹화 UI) |
| 메모 입력 | 자유 텍스트 메모 | 자유 텍스트 + **구조화된 증거 태그** (이미지/텍스트/URL 지정) |
| 데이터 캡처 | 기본 DOM 파싱 | DOM 파싱 + **스크린샷 자동 캡처** + 셀러 정보 자동 추출 |
| AI 분석 | 없음 | 제보 후 AI가 자동 분석 → **실시간 AI 분석 결과 미리보기** (Extension 팝업 내) |
| 신고서 작성 | 없음 (OMS Web에서 수동 작성) | AI가 자동 생성 (Extension에서는 제보만) |
| 상태 확인 | 없음 | **내 제보 상태 확인** 기능 (신고 진행 현황) |
| 인증 | OMS 자체 인증 | Supabase Auth (Google OAuth @spigen.com) |
| 중복 체크 | 없음 | 제보 시 **동일 ASIN 기존 신고 여부 경고** 표시 |

> **이행 전략**: 기존 OMS Extension 사용자(오퍼레이터 20명+)에게 Sentinel Extension 설치를 안내하고, 전환 기간 동안 양쪽 Extension을 병행 사용 가능하도록 지원. OMS Extension은 Sentinel 안정화 후 폐기.

#### Sentinel Web (신고 관리 웹사이트)
- **인증**: @spigen.com Google OAuth 로그인 (도메인 한정)
- **가입 시 기본 권한**: Viewer (읽기 전용), Admin이 Editor/Admin으로 변경 가능
- 신고 대기열: 크롤러 + 익스텐션에서 수집된 위반 사례 통합 관리
- 신고 드래프트 자동 생성: 위반 유형별 템플릿 기반
- 검토/승인 워크플로우: Editor 이상 권한으로 검토 → 승인/반려/직접 수정 후 승인
  - **승인**: AI 드래프트를 그대로 제출
  - **반려**: 반려 사유 기록 → Draft로 회귀 (AI 재분석 시 반려 사유 참고)
  - **직접 수정 후 승인**: Editor/Admin이 AI 드래프트를 직접 편집 후 바로 승인 (시간 절약용)
- PD Reporting + BR 연동: 승인 시 Extension이 PD 페이지에서 신고 → BR 케이스 오픈
- 대시보드: 위반 통계, 신고 현황, 트렌드 분석
- 리포트 생성: 주간/월간 자동 리포트 (경영진용)

---

## 4. 사용자 유형 (User Personas)

| 사용자 | 인원 | 주요 도구 | 핵심 역할 | 주요 기능 활성화 |
|--------|------|----------|----------|----------------|
| 아마존 오퍼레이터 | 20명+ | Chrome Extension | 현장 모니터링, 위반 발견 시 신고 요청 | MS1 (Extension 배포) |
| 팀 리더/매니저 | 5명 이하 | Sentinel Web | 신고 드래프트 검토, 승인 버튼 클릭 | MS2 (AI 분석 + 승인) |
| 브랜드 보호 담당자 | 3명 이하 | 대시보드/분석 리포트 | 전략 수립, 트렌드 분석 | MS3 (대시보드 + 트렌드) |
| 경영진 | 3명 이하 | 요약 대시보드/리포트 | 주간/월간 성과 확인 | MS3 (자동 리포트) |

---

## 5. 키워드 캠페인 기능 (Keyword Campaign)

### 개요
키워드 + 기간 + 국가를 등록하면, 해당 기간 동안 자동으로 아마존에서 검색 결과 **1~5페이지**의 모든 리스팅을 수집하고, 의심 리스팅을 필터링하여 신고 준비까지 자동화하는 핵심 기능

### 캠페인 등록 설정 항목
| 항목 | 설명 | 예시 |
|------|------|------|
| 키워드 (Keyword) | 아마존 검색 키워드 (복수 등록 가능) | "phone case", "screen protector" |
| 기간 (Period) | 시작일 ~ 종료일 | 2026-03-01 ~ 2026-03-31 |
| 국가 (Marketplace) | 대상 아마존 마켓플레이스 | US, UK, JP 등 (복수 선택 가능) |
| 크롤링 빈도 (Frequency) | 사용자가 직접 선택 | 하루 1회 / 12시간마다 / 6시간마다 등 |

### 동작 흐름
```
캠페인 등록 (키워드+기간+국가+빈도)
    ↓
설정된 빈도로 자동 크롤링 시작
    ↓
키워드 검색 결과 1~5페이지 리스팅 전체 수집
    ↓
의심 리스팅 자동 필터링 (키워드 플래그 등)
    ↓
의심 리스팅만 신고 대기열(Queue)에 등록
    ↓
Editor/Admin이 검토 → 승인 → 자동 신고
```

### 의심 리스팅 필터링 기준
- **키워드 플래그**: 허위/과장 관련 키워드 탐지 (예: "best", "FDA approved", "#1" 등)
- **이미지 플래그**: 경쟁사 브랜드 로고/이미지 유사도 (향후 AI 도입 시)
- **변동 탐지**: 이전 크롤링 대비 리스팅 내용 변경 감지
- ※ 최종 위반 판단은 AI(Claude)가 수행하고, 사람(Editor/Admin)이 승인

### 캠페인 관리 UI (Sentinel Web)
- 캠페인 목록: 활성/종료/예정 상태 표시
- 캠페인별 수집 현황: 총 리스팅 수 / 의심 리스팅 수 / 신고 완료 수
- 캠페인 수정/중지/삭제 가능 (Admin/Editor)
- 캠페인 결과 엑셀 다운로드

---

## 6. 기능 목록 및 우선순위 (Feature List)

| # | 기능 | 컴포넌트 | 우선순위 |
|---|------|---------|---------|
| F01 | 키워드 기반 리스팅 검색 및 목록 수집 | Crawler | P0 |
| F02 | 리스팅 상세 정보 수집 (전체) | Crawler | P0 |
| F03 | Anti-bot 회피 (프록시, Fingerprint, 사람 행동 모방) | Crawler | P0 |
| F04a | 다국가 마켓플레이스 지원 — US 마켓플레이스 | Crawler | P0 |
| F04b | 다국가 마켓플레이스 확장 (UK, JP 등 추가 국가) | Crawler | P1 |
| F05 | 스케줄링 및 자동 실행 관리 | Crawler | P0 |
| F06 | 아마존 상품 페이지 정보 자동 캡처 | Extension | P0 |
| F07 | 위반 유형 선택 및 메모 작성 UI | Extension | P0 |
| F08 | 스크린샷 자동 캡처 (증거 보존) | Extension | P0 |
| F09 | Sentinel Web API 연동 (신고 요청 전송) | Extension | P0 |
| F10 | 신고 대기열 관리 (Queue Management) | Web | P0 |
| F11 | AI 신고 드래프트 자동 생성 (성공률 최적화) | Web | P0 |
| F12 | 검토/승인 워크플로우 (Approve/Reject/Edit+Approve + 반려 사유 기록 + 직접 수정 후 즉시 승인) | Web | P0 |
| F13a | PD Reporting 반자동 접수 (Extension이 PD 페이지에서 폼 채우기 + 사람 최종 클릭) | Web | P0 |
| F13b | BR 케이스 자동 제출 (Brand Registry에 케이스 오픈 자동화) | Web | P1 |
| F14 | 사용자 인증 및 권한 관리 (RBAC) | Web | P0 |
| F15 | 위반 통계 대시보드 | Web | P1 |
| F16 | 신고 이력 및 상태 추적 | Web | P0 |
| F17 | 주간/월간 자동 리포트 생성 (경영진용) | Web | P2 |
| F18 | 위반 트렌드 분석 및 알림 | Web | P1 |
| F19 | 신고 후 리스팅 자동 재방문 및 변화 감지 | Crawler/Web | P0 |
| F20a | 신고 상태 라이프사이클 기본 (Draft→Submitted + Rejected/Cancelled 상태 관리) | Web | P0 |
| F20b | 신고 상태 라이프사이클 확장 (Monitoring→Resolved/Unresolved + Re-submitted/Escalated) | Web | P0 |
| F21 | 미해결 신고 알림 (설정 기간 경과 후 인앱 알림) | Web | P0 |
| F22 | 버전 관리 로그 (Changelog 페이지 + 로그인 후 알림) | Web | P1 |
| F23 | AI 이미지 위반 분석 (Claude Vision으로 로고/이미지 무단 사용 탐지) | Web | P0 |
| F24 | AI 특허 유사도 분석 (특허 레지스트리 대비 유사도 판정) | Web | P0 |
| F25 | Monday.com 특허 데이터 자동 동기화 (하루 1회 + 수동 트리거) | Web | P0 |
| F26 | 중복 신고 방지 (ASIN + 위반 유형 기준 Deduplication) | Web | P0 |
| F27 | 감사 로그 (인증, 권한 변경, 신고 승인/반려, SC 접근 이력 기록) | Web | P0 |
| F28 | 시스템 상태 모니터링 (크롤러 실패, AI API 오류, SC 자동화 실패 알림) | Web | P1 |
| F29 | 신고 템플릿 관리 (Admin이 위반 유형별 신고서 템플릿 수정 가능) | Web | P1 |
| F30 | AI 강화 재신고서 자동 생성 (이전 케이스 이력 + 추가 증거 포함, 에스컬레이션 톤 조절) | Web | P0 |
| F31 | Extension 버전 관리 및 업데이트 알림 (새 버전 배포 시 설치 유도 알림) | Extension/Web | P1 |
| F32 | 의심 리스팅 필터 기준 관리 (Admin이 키워드 플래그 임계값/규칙 설정 가능) | Web | P1 |
| F33 | 웹 수동 기입 (Admin/Editor가 ASIN + 위반유형 직접 입력하여 신고 요청) | Web | P0 |
| F34 | Auto-approve 설정 (위반유형별 ON/OFF + AI 확신도 임계값, Settings에서 관리) | Web | P1 |
| F35 | 모니터링 스크린샷 캡처 + AI 리마크 (재방문 시 스크린샷 + AI 위반영역 좌표/분석) | Crawler/Web | P0 |
| F36 | 모니터링 주기 설정 (재확인 주기 기본 7일, Settings에서 변경 가능) | Web | P1 |
| F37 | AI Skill 시스템 (위반유형별 학습 문서 관리, Opus가 업데이트 + Sonnet이 참조) | Web | P0 |

> **개발 방식**: **마일스톤 기반 개발** (설계는 전체, 구현은 3단계)
> - P0 (필수): 반드시 포함 — 마일스톤 1~2에서 구현
> - P1 (중요): 가능하면 함께 — 마일스톤 3에서 구현
> - P2 (편의): 후순위 — 출시 후에도 가능

---

## 6-1. 개발 전략

### 마일스톤 기반 개발 (Milestone-Driven)

> 설계는 전체 기능을 한 번에 수행하여 통일성을 확보하고, 구현은 3단계 마일스톤으로 나누어 중간 검증을 수행합니다.

| 항목 | 설명 |
|------|------|
| **방식** | 설계 전체 일괄 → 구현 3단계 마일스톤 → 마일스톤별 검증 |
| **이유** | 비개발자 팀 중간 검증 필요, 기능 간 순차 의존성, SC 자동화 법무 검토 대기 |
| **목표** | 각 마일스톤마다 End-to-End 동작 확인 후 다음 단계 진행 |
| **성공 기준** | 마일스톤 3 완료 시 전체 파이프라인 End-to-End 동작 |

#### 마일스톤 1: 데이터 수집 + 기본 웹 플랫폼

| 기능 | 검증 목표 |
|------|----------|
| F01, F02, F03, F04a, F05 (Crawler) | 키워드 캠페인으로 리스팅 자동 수집 |
| F06, F07, F08, F09 (Extension) | 오퍼레이터 원클릭 제보 동작 |
| F14 (인증/RBAC) | Google OAuth 로그인 + 권한 체계 |
| F10 (신고 대기열) | 크롤러/Extension 데이터가 대기열에 도착 |
| F26 (중복 방지) | 동일 ASIN 중복 제거 |
| F27 (감사 로그) | 인증/권한 이벤트 기록 |

**마일스톤 1 검증**: "크롤러로 수집한 리스팅 + Extension 제보가 Sentinel Web 대기열에 표시되는가?"

#### 마일스톤 2: AI 분석 + 신고 파이프라인

| 기능 | 검증 목표 |
|------|----------|
| F23 (AI 이미지 분석) | Claude Vision으로 이미지 위반 판단 |
| F24 (AI 특허 유사도) | 특허 레지스트리 대비 유사도 분석 |
| F25 (Monday.com 동기화) | 특허 데이터 자동 동기화 |
| F11 (AI 신고서 드래프트) | 위반 분석 + 신고서 자동 생성 |
| F12 (승인 워크플로우) | Editor/Admin 검토 및 승인 |
| F13a (SC 반자동 신고) | 자동 폼 채우기 + 사람 최종 제출 |
| F16 (신고 이력 추적) | 신고 상태 라이프사이클 관리 |
| F20a (상태 라이프사이클 기본) | Draft→Submitted + Rejected/Cancelled 상태 관리 |
| F30 (AI 강화 재신고) | 재신고 시 AI 강화 드래프트 자동 생성 |

**마일스톤 2 검증**: "AI가 위반 판단 + 신고서 드래프트 → 승인/반려 → PD Reporting + BR 케이스 접수까지 동작하는가?"

#### 마일스톤 3: 운영 기능 + 완성

| 기능 | 검증 목표 |
|------|----------|
| F04b (다국가 확장) | UK, JP 등 추가 마켓플레이스 |
| F13b (SC 완전 자동) | 반자동 안정화 후 완전 자동 전환 |
| F19, F20b, F21 (팔로업) | 신고 후 자동 재방문 + Monitoring→Resolved/Unresolved + 미해결 알림 |
| F31 (Extension 업데이트 알림) | 새 버전 배포 시 오퍼레이터 설치 유도 |
| F32 (필터 기준 관리) | Admin 의심 리스팅 필터 규칙 설정 |
| F15 (대시보드) | 위반 통계 시각화 |
| F17 (자동 리포트) | 주간/월간 경영진 리포트 |
| F18 (트렌드 분석) | 위반 트렌드 및 알림 |
| F22 (Changelog) | 버전 관리 로그 |
| F28 (시스템 모니터링) | 크롤러/AI/SC 상태 모니터링 |
| F29 (템플릿 관리) | 신고서 템플릿 Admin 관리 |

**마일스톤 3 검증**: "전체 파이프라인 End-to-End + 운영 기능 동작 확인"

---

## 7. 기술 스택 (Recommended Tech Stack)

| 영역 | 기술 | 선정 이유 |
|------|------|----------|
| 크롤러 | Node.js + Playwright | Anti-bot 회피 우수, 다중 브라우저 지원 |
| 크롬 익스텐션 | Chrome Extension (Manifest V3) | 표준 크롬 익스텐션 API |
| 프론트엔드 | Next.js + React + Tailwind CSS | 빠른 개발, AI 코드 생성 용이 |
| 백엔드 | Next.js API Routes 또는 Node.js + Express | 프론트엔드와 통합 가능 |
| 데이터베이스 | PostgreSQL + Supabase | 무료 티어, 인증/스토리지 포함 |
| 인증 | Google OAuth (@spigen.com 도메인 한정) + Supabase Auth | 사내 도메인 SSO, RBAC 3단계 |
| 파일 저장소 | Supabase Storage 또는 AWS S3 | 스크린샷/이미지 저장 |
| 배포 | Vercel (Web) + AWS/Railway (Crawler) | 간편 배포, 자동 스케일링 |
| 프록시 | Bright Data / Oxylabs | 주거지 프록시로 Anti-bot 회피 |
| SC 자동화 | Playwright (Browser Automation) | 브라우저 자동화로 케이스 오픈 (**SC에 케이스 오픈 API 없음**, 웹 UI 자동화가 유일한 방법) |
| 외부 연동 | Monday.com GraphQL API | 특허 데이터 단방향 동기화 (하루 1회) |
| AI 분석 | Anthropic Claude API (Opus + Sonnet + Haiku) | Opus: AI 학습, Sonnet: 드래프트 생성, Haiku: 모니터링 |
| 작업 큐 / 스케줄링 | BullMQ + Redis | 크롤링 스케줄링, 팔로업 재방문, 배치 처리 |
| 차트 / 시각화 | Recharts | React 기반 대시보드 차트 (F15) |
| 리포트 생성 | exceljs / jspdf | 주간/월간 리포트 엑셀/PDF 생성 (F17) |
| 실시간 알림 | Supabase Realtime | 인앱 알림 (F21) |
| Secrets 관리 | 환경 변수 + Vercel Environment Variables | API 키, SC 자격증명 등 민감 정보 관리 |

---

## 7-1. 보안 요구사항 (Security Requirements)

> 기획 검증(Security Architect) 결과 도출된 보안 요구사항

### 자격증명 관리

| 자격증명 | 민감도 | 관리 방안 |
|---------|--------|----------|
| SC 로그인 (비밀번호, MFA) | 최고 | 암호화 저장, Admin만 등록, 시스템만 읽기 |
| Claude API Key | 최고 | 서버 환경 변수, 클라이언트 노출 금지 |
| Monday.com API Token | 최고 | 서버 환경 변수, read-only 토큰 사용 |
| Proxy Service API Key | 높음 | 서버 환경 변수 |
| Supabase Service Role Key | 최고 | 서버 환경 변수, NEXT_PUBLIC_ 접두사 금지 |
| Google OAuth Client Secret | 최고 | 서버 환경 변수 |

### 인증/세션 보안 설정값

- Idle timeout: 30분
- Absolute timeout: 8시간
- 토큰 저장: httpOnly, Secure, SameSite=Strict 쿠키
- 퇴사자: Google Workspace 비활성화 시 자동 인증 실패
- 동시 세션: 한 계정 최대 3개 세션 허용 (초과 시 가장 오래된 세션 만료)
- Brute-force 방어: 5회 연속 실패 시 15분 잠금, IP 기반 Rate Limiting

### RBAC 상세 매트릭스

| 리소스 | Admin | Editor | Viewer |
|--------|-------|--------|--------|
| 사용자 관리 | CRUD | - | - |
| 시스템 설정 | CRUD | - | - |
| 캠페인 관리 | CRUD | CRUD | R |
| 신고 드래프트 | CRUD | CRU(자기것) | R |
| 신고 승인 | O | O | - |
| 대시보드 | R | R | R |
| SC 자격증명 | CRU | - | - |
| API 키 관리 | CRUD | - | - |
| Changelog 관리 | CRUD | - | R |
| 감사 로그 | R | - | - |

### SC 자격증명 보안 상세

> 설계 단계에서 반드시 확정할 항목

| 항목 | 설계 시 결정 필요 |
|------|------------------|
| 암호화 알고리즘 | AES-256-GCM 등 구체적 방식 확정 |
| 암호화 키 관리 | Supabase Vault, AWS KMS 등 마스터 키 저장/로테이션 |
| MFA 처리 | TOTP seed 안전 저장 및 자동 MFA 통과 흐름 |
| 비밀번호 갱신 | 변경 주기 및 갱신 프로세스 |

### 감사 로그 (F27) 상세 요구사항

| 항목 | 요구사항 |
|------|---------|
| 변경 불가성 | append-only 테이블, DELETE/UPDATE 권한 제거, DB trigger 기반 |
| 기록 필드 | who(사용자), what(액션), when(타임스탬프), where(IP/디바이스), before/after(변경 전후 값) |
| 기록 대상 | 인증(로그인/로그아웃), 권한 변경, 신고 승인/반려, SC 자격증명 접근, 특허 동기화, 설정 변경 |
| 보존 기간 | 최소 2년 (법적 요건 확인 후 확정) |
| 검색/필터 | 사용자별, 기간별, 액션 유형별 조회 (Admin 전용) |

### 데이터 보존/삭제 정책

| 데이터 유형 | 보존 기간 | 삭제 방식 |
|------------|----------|----------|
| 크롤링 리스팅 데이터 | 1년 (마지막 활동 기준) | 자동 아카이브 후 삭제 |
| 스크린샷/이미지 | 신고 해결 후 6개월 | Supabase Storage 삭제 |
| 신고 이력 | 영구 보존 | 삭제 불가 |
| 감사 로그 | 최소 2년 | 삭제 불가 |
| 특허 레지스트리 | Monday.com 동기화 유지 | Monday.com 삭제 시 자동 반영 |

### Chrome Extension 배포 보안

> 현재 결정: .crx 직접 배포 (D12)
> **강력 권고**: Google Workspace Admin Console 강제 설치 방식으로 전환 (설계 단계에서 최종 결정)
>
> Spigen이 @spigen.com Google Workspace를 사용하므로, Admin Console에서
> ExtensionInstallForcelist 정책으로 조직 단위 강제 배포가 가능합니다.
> 이 방식은 자동 업데이트 지원, 개발자 모드 불필요, 무결성 검증이 장점입니다.

### Extension-Web API 통신 보안

- HTTPS 필수 (TLS 1.3)
- CORS: Sentinel Web 도메인만 허용
- Origin 검증: Extension의 chrome-extension:// 출처 확인
- 인증: Supabase Auth JWT 토큰 필수 (매 요청 검증)
- Content Script 권한: amazon.com 도메인만 host_permissions 제한

### 개발 시 보안 체크리스트

- [ ] 코드에 API 키/시크릿 하드코딩 금지
- [ ] 모든 API 엔드포인트에 서버 사이드 RBAC 체크 미들웨어 적용
- [ ] 프론트엔드 UI 숨김은 UX 용도만, 보안은 서버에서 처리
- [ ] Extension → Web API 통신 시 인증 토큰 필수 + CORS + Origin 검증
- [ ] Claude API 호출은 서버 사이드에서만 수행
- [ ] Claude API 프롬프트: 시스템/사용자 입력 분리, 응답 JSON 스키마 검증
- [ ] Supabase RLS (Row Level Security) 활성화
- [ ] 보안 헤더 설정 (HSTS, X-Frame-Options, CSP 등)
- [ ] SC 자격증명 접근 시 모든 접근을 감사 로그로 기록
- [ ] 모든 외부 통신 HTTPS 필수 (TLS 1.3)
- [ ] npm audit 주기적 실행, dependabot 또는 renovate 설정
- [ ] 감사 로그 테이블 DELETE/UPDATE 권한 제거 (append-only)

---

## 8. 리스크 및 제약사항 (Risks & Constraints)

### 기술적 리스크
| 리스크 | 설명 | 완화 방안 |
|--------|------|----------|
| 아마존 Bot 탐지 | 강력한 Anti-bot 시스템으로 IP 차단/CAPTCHA 발생 | 주거지 프록시, Fingerprint 랜덤화, 사람 행동 모방, 요청 속도 조절 |
| Seller Central 자동화 불안정 | UI 변경 시 자동화 스크립트 깨짐 | UI 변경 탐지 모니터링, 모듈화된 셀렉터, Fallback 매뉴얼 모드 |
| 아마존 페이지 구조 변경 | HTML 구조 변경으로 크롤러/익스텐션 오동작 | 셀렉터 자동 테스트, 변경 감지 알림, 빠른 패치 프로세스 |

### 법적/정책 리스크
| 리스크 | 설명 | 완화 방안 |
|--------|------|----------|
| 아마존 ToS 위반 | 자동화된 스크래핑 금지 | 법무팀 검토, 요청 빈도 최소화, Brand Registry 공식 툴 병행 |
| SC 자동 조작 리스크 | 계정 정지 등 제재 가능성 | 반자동화 접근 (Fallback), 사람 승인 필수, 속도 제한 |
| 데이터 보안 | 경쟁사 데이터 및 SC 자격증명 보안 | 암호화 저장, 접근 권한 최소화, 감사 로그 |

### 운영 리스크
| 리스크 | 설명 | 완화 방안 |
|--------|------|----------|
| 개발 리소스 부족 | 비개발자 중심 팀 | Claude 등 AI 도구 적극 활용, 핵심 기능 우선, 필요시 외부 개발자 |
| 프록시 비용 | 대량 크롤링 시 비용 상당 | 크롤링 빈도/범위 최적화, 비용 모니터링, 캐싱 전략 |

---

## 9. 주요 결정 이력 (Decision Log)

| # | 날짜 | 결정 사항 | 근거 |
|---|------|----------|------|
| D01 | 2026-02-27 | 제품명 "Sentinel (센티널)" 확정 | 여러 후보 중 사용자 선택 |
| D02 | 2026-02-27 | ~~위반 판단은 사람이 수동으로 수행~~ → D22로 대체: AI(Claude)가 위반 판단 수행, 사람은 승인만 | 법적 리스크와 정확도 고려 → AI 도입으로 변경 |
| D03 | 2026-02-27 | 3개 컴포넌트 구성 (Crawler + Extension + Web) | 업무 흐름 분석 결과 도출 |
| D04 | 2026-02-27 | 서드파티 API 미사용, 직접 브라우저 자동화 방식 채택 | 서드파티 API 접근 불가 판단 |
| D05 | 2026-02-27 | ~~신고 자동화는 Phase 3에서 구현~~ → ~~전체 기능 일괄 개발~~ → 마일스톤 기반 개발로 변경 (D28) | 페이즈 구분 제거 → 마일스톤 도입 |
| D06 | 2026-02-27 | 기술 스택: Node.js/Next.js/Playwright 중심 | 비개발자 팀 + AI 도구 활용 최적화 |
| D07 | 2026-02-27 | 사용 범위: 회사 내 여러 팀 (내부 툴) | 사용자 요구사항 |
| D08 | 2026-02-27 | 기한 없음, 품질 우선 개발 | 사용자 요구사항 |
| D09 | 2026-02-27 | PRD v1.0 완성 (Word 문서) | 기획 단계 첫 산출물 |
| D10 | 2026-02-27 | 인증: @spigen.com Google OAuth, 가입 즉시 Viewer 배정 | 사내 도메인 한정 접근 |
| D11 | 2026-02-27 | 권한 3단계: Admin / Editor / Viewer | 역할별 최소 권한 원칙 |
| D12 | 2026-02-27 | Chrome Extension 구글 스토어 미등록, .crx 직접 배포 | 사내 전용 툴 |
| D13 | 2026-02-27 | 키워드 캠페인 기능 추가 (키워드+기간+국가+빈도 등록 → 1~5페이지 자동 수집) | 핵심 자동화 기능 |
| D14 | 2026-02-27 | 의심 리스팅 자동 필터링 (키워드 플래그), 최종 판단은 AI + 사람 승인 (D22 반영) | 효율성과 정확성 균형 |
| D15 | 2026-02-27 | 위반 유형 5카테고리 19개 세부 유형으로 체계화, 월간 업데이트 필수 | 아마존 정책 수시 변경 대응 |
| D16 | 2026-02-27 | Crawler는 리스팅 콘텐츠 위반(V05~V10) + 특허 침해(V03)만 자동 탐지 | 자동 탐지 가능한 유형만 |
| D17 | 2026-02-27 | 나머지 위반 유형은 오퍼레이터가 Extension으로 수동 신고 | 사람 판단 필요한 유형 |
| D18 | 2026-02-27 | Spigen 특허 레지스트리 기능 추가 (특허 목록 등록 → 리스팅 자동 비교) | 특허 침해 자동 탐지 지원 |
| D19 | 2026-02-27 | 특허 데이터 Monday.com GraphQL API 단방향 동기화, 하루 1회 | Monday.com이 특허 관리 SSOT |
| D20 | 2026-02-27 | 신고 후 팔로업 자동화: 리스팅 재방문→변화감지→인앱 알림 | 수동 팔로업 업무 자동화 |
| D21 | 2026-02-27 | 알림은 Sentinel Web 인앱 알림만 (이메일 없음) | 간결한 알림 채널 |
| D22 | 2026-02-27 | Claude API(Opus)로 위반 판단 자동화, 사람은 승인만 | AI 활용으로 판단 업무 자동화 |
| D23 | 2026-02-27 | AI 분석 영역: 이미지 위반 + 특허 유사도 + 신고서 드래프트 | 핵심 3개 영역 집중 |
| D24 | 2026-02-27 | AI는 의심 리스팅에만 호출 (비용 최적화) | API 비용 관리 |
| D25 | 2026-02-27 | AI 신고서는 성공률 최적화 방식으로 작성 (정책 인용, 증거 기반, 고객 피해, 에스컬레이션) | 신고 목적은 리스팅 수정/제거 |
| D26 | 2026-02-27 | ~~페이즈 구분 제거, 전체 기능 일괄 개발 후 출시~~ → D28로 대체 | 내부 도구, 반쪽짜리 방지, 통합 효율 → 마일스톤 도입 |
| D27 | 2026-02-27 | 버전 관리 Changelog: 전용 페이지 + 로그인 후 팝업/배너 알림 | 사용자 투명성 |
| D28 | 2026-02-27 | 마일스톤 기반 개발 전략 도입 (설계 전체 → 구현 3단계) | 비개발자 팀 중간 검증, 순차 의존성, 법무 검토 대기 |
| D29 | 2026-02-27 | F04 다국가 지원 범위 분리: US만 P0, 나머지 국가 확장은 P1 | 핵심 파이프라인 우선, 점진적 확장 |
| D30 | 2026-02-27 | F13 SC 자동 신고를 단계적 구현: 1차 반자동(폼 채우기+사람 제출) → 안정화 후 완전 자동 전환 | SC 계정 정지 리스크 완화 |
| D31 | 2026-02-27 | 기획 검증 후 누락 기능 추가: F23~F29 (AI 분석, 특허 동기화, 중복 방지, 감사 로그, 시스템 모니터링, 템플릿 관리) | PM/보안/설계 검증 결과 반영 |
| D32 | 2026-02-28 | 신고 상태 라이프사이클에 Rejected/Cancelled 상태 추가 | 3차 검증 — 상태 머신 불완전 지적 (PM+설계) |
| D33 | 2026-02-28 | F20을 F20a(기본, MS2)/F20b(확장, MS3)로 분리 | 3차 검증 — MS2 검증에 상태 관리 필요 (PM) |
| D34 | 2026-02-28 | F30~F32 신규 기능 추가: AI 강화 재신고(F30), Extension 업데이트 알림(F31), 필터 기준 관리(F32) | 3차 검증 — PM 재신고 흐름 누락, 설계 관리 기능 부재 |
| D35 | 2026-02-28 | AI 반려 학습(Rejection Feedback Loop) 기능 추가 | 반려 사유를 AI 프롬프트에 주입하여 동일 실수 방지 |
| D36 | 2026-02-28 | 승인 워크플로우에 "직접 수정 후 즉시 승인" 옵션 추가 | 시간 절약용 — 반려 없이 Editor/Admin이 드래프트 편집 후 바로 제출 |
| D37 | 2026-02-28 | 보안 요구사항 대폭 보강: SC 암호화 상세, 감사 로그 상세, 데이터 보존 정책, Extension 통신 보안, 프롬프트 인젝션 방어 | 3차 보안 검증 (A-) 피드백 반영 |
| D38 | 2026-02-28 | AI 피드백 학습을 "반려 학습"에서 "수정본 학습"까지 확장. 원본 vs 수정본 diff를 저장하고 AI 프롬프트에 반영 | Editor/Admin의 직접 수정도 AI 학습 대상으로 포함 |
| D39 | 2026-02-28 | SC 케이스 오픈 공식 API 부재 확인 → Playwright 브라우저 자동화가 유일한 방법 | 웹 검색 확인 결과 SP-API에 케이스 관리 기능 없음 |
| D40 | 2026-02-28 | 기존 OMS 시스템 분석 완료, Sentinel 기획서에 AS-IS/TO-BE 매핑 반영 | OMS 17개 스크린샷 + PDF 교육자료 분석 결과 |
| D41 | 2026-02-28 | OMS 10개 위반 유형 ↔ Sentinel V01~V19 매핑 테이블 확정 | OMS "Other Concerns" 세분화, Monday.com Patent 통합 |
| D42 | 2026-02-28 | Spigen 등록 상표 목록 기획서에 추가 (AI 분석용) | PDF 교육자료 기반 10개 상표명 + 3가지 마크 유형 |
| D43 | 2026-02-28 | 제품 카테고리 13개 명시 (OMS Settings 기반) | Campaign/AI 분석에서 제품군 맥락 정보로 활용 |
| D44 | 2026-02-28 | 기존 OMS 템플릿 시스템(67개) → Sentinel AI 신고서 참조 체계 정의 | AI가 템플릿을 프롬프트 컨텍스트로 활용, Admin이 관리 |
| D45 | 2026-02-28 | AI vs 사용자 위반 판단 불일치 처리 워크플로우 정의 | Report 필드 구조, 불일치 배지 UI, 리뷰 우선순위 상향 |
| D46 | 2026-02-28 | 신고 도구 통합 확정: OMS + Monday.com → Sentinel 단일 플랫폼 | 특허는 Monday.com SSOT 유지, 나머지 전부 Sentinel |
| D47 | 2026-02-28 | OMS Extension → Sentinel Extension 진화 포인트 8가지 정의 | AI 분석 미리보기, 중복 체크, 내 제보 상태 확인 등 |
| D48 | 2026-02-28 | Amazon Policy 5가지 + Spigen IP 3대 축 AI 프롬프트 내장 체계 정의 | PDF 교육자료 기반 지식 체계 |
| D49 | 2026-02-28 | 수집 경로 3개로 확장: 크롤러 + Extension + **웹 수동 기입** (Admin/Editor가 ASIN+위반유형 직접 입력) | 크롤러/Extension 외에도 웹에서 직접 신고 요청 가능 |
| D50 | 2026-02-28 | Auto-approve 기능 추가: 위반유형별 ON/OFF + AI 확신도 임계값(기본 90%) 조건 충족 시 자동 제출 | 명확한 위반은 수동 승인 없이 바로 제출 |
| D51 | 2026-02-28 | Rejected(반려) → Re-write로 변경: AI에게 피드백 반영하여 재작성 요청 | 신고 자체를 거부하는 게 아니라 AI가 다시 쓰게 하는 개념 |
| D52 | 2026-02-28 | Pending = AI 능동 모니터링으로 재정의: 매 N일 크롤러 재방문 + 스크린샷 + AI 리마크 | 아마존은 신고 결과 통보 안 함 → 직접 확인 필요 |
| D53 | 2026-02-28 | 모니터링 스크린샷 AI 마킹: UI 오버레이 방식 (원본 보존 + 좌표 데이터 DB 저장 + CSS 오버레이) | 원본 무결성 + 마킹 토글 + 이미지 가공 불필요 |
| D54 | 2026-02-28 | Teacher-Student AI 아키텍처 도입: Opus(학습) + Sonnet(드래프트) + Haiku(모니터링) | 비용 최적화 — 건당 $0.09, 월 $270 (일 100건 기준). 시간 경과 시 자동 비용 감소 |
| D55 | 2026-02-28 | AI Skill 시스템: 위반유형별 학습 문서를 Opus가 업데이트하고 Sonnet이 참조하여 드래프트 작성 | Skill 성숙도에 따라 드래프트 품질 자동 향상 + Re-write 비율 감소 |
| D56 | 2026-02-28 | 모니터링 주기 설정: 기본 7일, Admin이 Settings에서 변경 가능 | 위반 유형/긴급도에 따라 재확인 주기 조절 |

---

## 10. 산출물 목록 (Deliverables)

| # | 산출물 | 형식 | 상태 | 비고 |
|---|--------|------|------|------|
| 1 | Sentinel PRD v1.0 | .docx | ✅ 완성 | 제품 요구사항 문서 (전체 기획서) |
| 2 | 프로젝트 컨텍스트 | .md | ✅ 완성 | 본 문서 (대화 내용 정리) |

---

## 11. 다음 단계 (Next Steps)

이 프로젝트를 이어가려면 다음 순서를 권장합니다:

### 설계 단계 진입 시 우선 결정 사항 (3차 검증 결과)

> 이하 4개 항목은 DB 스키마 설계의 첫 번째 블로킹 요소입니다.

1. **Crawler → DB 접근 패턴 결정**: Supabase DB에 직접 write vs Sentinel Web API 경유 (보안 vs 간결성 트레이드오프)
2. **Redis 배포 위치 결정**: Upstash(서버리스) vs Railway-hosted Redis vs AWS ElastiCache (Crawler 서버와 co-location 필요)
3. **SC 자격증명 암호화 방식 확정**: AES-256-GCM 등 알고리즘 + 마스터 키 관리(Supabase Vault/AWS KMS)
4. **공유 타입/상수 패키지 전략**: pnpm workspace + `packages/shared` 구조 (Web, Crawler, Extension 간 타입 공유)

### 즉시 필요한 작업 (개발 착수 전)
1. **법무팀 검토 요청**: 아마존 ToS(크롤링/SC 자동화) 법적 리스크 확인 — **개발 착수 전 필수**
2. **Monday.com 특허 보드 구조 확인**: 보드 ID/컬럼 구성 확인 → 필드 매핑 확정
3. **기술 검증 (PoC)**: Playwright로 아마존 단일 페이지 크롤링 테스트 (Anti-bot 회피 가능 여부)
4. **Supabase 무료 티어 제한 확인**: 스토리지, DB 크기, API 호출 한도
5. **Claude API 비용 추정**: 일일 예상 호출 수 × 토큰 단가
6. **프록시 서비스 비용 비교**: Bright Data vs Oxylabs
7. **Google OAuth @spigen.com 도메인 제한 구현 방식 확인**
8. **PD 페이지 신고 양식 + BR 케이스 필드 매핑 조사**
9. **Chrome Extension 배포 방식 최종 결정**: .crx vs Google Workspace Admin Console
10. **Spigen 등록 상표 전체 목록 확보**: 법무팀/IP팀에서 전체 등록 상표 + 마크 유형 확인 (현재 10개는 교육자료 기반 일부)
11. **기존 OMS 67개 템플릿 데이터 확보**: OMS 관리자에게 위반 유형별 템플릿 전체 export 요청 → Sentinel DB 마이그레이션용
12. **OMS → Sentinel 전환 계획 수립**: 기존 OMS 사용자(오퍼레이터 20명+) 전환 일정, 교육, 병행 운영 기간 결정

### 개발 착수 시 (마일스톤 순서)
1. 개발 환경 셋업 (Node.js, Playwright, Supabase, Redis 등)
2. 전체 설계: DB 스키마 + API 명세 + Extension-Web 통신 규약
3. **마일스톤 1**: 크롤러 + Extension + 인증 + 대기열 → 검증
4. **마일스톤 2**: AI 분석 + 승인 워크플로우 + SC 반자동 신고 → 검증
5. **마일스톤 3**: 팔로업 + 대시보드 + 운영 기능 → 검증 → 출시

### Claude에게 이어서 요청할 때
이 문서와 PRD를 함께 첨부한 뒤 다음과 같이 요청하세요:
> "이 프로젝트 컨텍스트와 PRD를 읽고, [원하는 작업]을 진행해줘"

예시:
- "데이터베이스 스키마를 설계해줘"
- "Chrome Extension 프로토타입 코드를 만들어줘"
- "Playwright로 아마존 상품 페이지 크롤링 PoC를 만들어줘"
- "Claude API 연동 프롬프트를 설계해줘"
- "PRD에서 [특정 섹션]을 수정해줘"

---

## 12. 용어 정의 (Glossary)

| 용어 | 정의 |
|------|------|
| Listing (리스팅) | 아마존에 등록된 상품 페이지 |
| Policy Violation (폴리시 위반) | 아마존이 정한 판매 정책을 어기는 행위 |
| Seller Central | 아마존 판매자용 관리 플랫폼 |
| Case (케이스) | Brand Registry에서 열리는 신고/문의 건 |
| ASIN | Amazon Standard Identification Number - 아마존 고유 상품 식별자 |
| Anti-bot | 자동화된 접근을 탐지/차단하는 보안 시스템 |
| Proxy (프록시) | IP 주소를 변경하여 접속하는 중계 서버 |
| Fingerprint | 브라우저 고유 식별 정보 (해상도, 폰트, 플러그인 등의 조합) |
| RBAC | Role-Based Access Control - 역할 기반 접근 권한 관리 |
| MVP | Minimum Viable Product - 최소 기능 제품 |
| PRD | Product Requirements Document - 제품 요구사항 문서 |
| PoC | Proof of Concept - 기술 검증 |
| SC | Seller Central의 약어 |
| DOM | Document Object Model - 웹페이지 구조 |
| Queue (대기열) | 처리 대기 중인 항목들의 목록. Sentinel에서는 신고 대기열을 의미 |
| Campaign (캠페인) | 키워드 + 기간 + 국가 + 빈도로 등록하는 자동 크롤링 단위 |
| Draft (드래프트) | 신고서 초안. AI가 자동 생성하고 사람이 검토/승인 |
| Variation | 아마존에서 색상/사이즈 등 옵션을 하나의 리스팅으로 묶는 기능 |
| Vine | 아마존의 공식 리뷰 프로그램 (Amazon Vine) |
| SSOT | Single Source of Truth - 데이터의 유일한 원본 소스 |
| Side-loading | 공식 스토어를 거치지 않고 앱/확장 프로그램을 직접 설치하는 방식 |
| Manifest V3 | Chrome Extension의 최신 API 규격 |
| Brand Registry | 아마존의 브랜드 등록 및 보호 프로그램 |
| Project Zero | 아마존의 위조품 자동 제거 프로그램 |
| Deduplication | 동일한 데이터의 중복을 제거하는 처리 |
| Audit Log (감사 로그) | 시스템 내 주요 활동(인증, 권한 변경, 승인 등)의 변경 불가한 기록 |
| OMS | Order Management System - Spigen의 기존 위반 신고 관리 시스템 (oms.spigen.com) |
| Trademark (상표) | 등록된 브랜드명/로고/디자인으로 법적 보호를 받는 식별 표시 |
| Design Mark | 시각적 디자인(로고/도형)으로 구성된 상표 유형 |
| Standard Character | 문자열(텍스트)로 구성된 상표 유형 |
| Character Logo | 문자와 디자인이 결합된 상표 유형 |
| Design Patent | 제품의 외관 디자인을 보호하는 특허 |
| Utility Patent | 제품의 기능/구조를 보호하는 특허 |
| Disagreement Flag | AI와 사용자의 위반 유형 판단이 불일치할 때 자동 설정되는 플래그 |
| Template (템플릿) | OMS에서 사용하던 위반 유형별 미리 정의된 신고서 양식 (총 67개). Sentinel에서는 AI 프롬프트 참조용 |

---

*이 문서는 프로젝트 진행에 따라 지속적으로 업데이트되어야 합니다.*
*최종 업데이트: 2026-02-28 (Teacher-Student AI 아키텍처 + Report 프로세스 개선 + 모니터링 스크린샷 — D49~D56 추가)*
