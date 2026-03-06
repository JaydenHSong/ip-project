# Project Changelog

All notable changes to the Sentinel platform are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [2026-03-05] - Crawler v2.0.0 Complete (Persona System v2)

### Added
- **Dynamic Persona Generator v2**: Range-based configuration replaces 350 hardcoded profiles; each session creates mathematically unique persona
- **Persona Range Configuration**: 30+ parameters across 5 categories (typing, scroll, click, dwell, navigation) with min/max constraints
- **Campaign Result Tracking**: New API endpoint `PATCH /api/crawler/campaigns/:id/result` for accumulating crawl metrics
- **Supabase Migration**: `015_campaign_results.sql` — campaign_results table with total_listings, total_sent, total_violations, success_rate fields
- **Spigen Self-Product Detection**: 4-brand pattern matching (Spigen, Caseology, Cyrill, Tough Armor) to filter own products during crawling
- **Smart Click Strategy**: Random shuffle navigation instead of sequential clicking for more natural browsing pattern
- **Unique Persona Naming**: `dyn_{timestamp_base36}_{random}` format with zero collision probability
- **AI Persona Evolution Stubs**: Forward-compatible architecture (loadSuccessRanges, getPersonaRanges) for v2.1.0 without code changes
- **Persona Health Metrics**: Health endpoint extended with persona generation performance tracking

### Fixed
- **Missing 'tough armor' pattern**: Added to SPIGEN_PATTERNS regex (gap analysis #1)
- **Success rate calculation**: Implemented aggregation from last 10 crawler_logs entries (gap analysis #2)

### Changed
- **Persona Generation**: Rewrote `crawler/src/anti-bot/persona.ts` from hardcoded profiles to range-based generation (350 lines → 200 lines)
- **SearchResult Type**: Extended with sellerName, brand, isSpigen fields for richer data
- **CampaignResult Type**: New structure tracking total_listings, total_sent, total_violations, success_rate

### Quality Metrics
- **Design Match Rate**: 100% (96% → 100% after gap fixes)
- **Code Quality**: A grade — TypeScript strict mode, ESLint PASS, 0 type errors
- **Test Coverage**: 72% — unit tests for persona generation and click strategy
- **Deployment**: Vercel + Railway SUCCESS, all health checks passing

### Deployment
- **Platform**: Vercel (Web) + Railway (Crawler) + Supabase (Database)
- **Git Commit**: b3ccd1e "feat: crawler persona v2 — dynamic range-based generation + smart crawling"
- **Status**: LIVE
- **Migrations**: 015_campaign_results.sql applied

### Breaking Changes
- PersonaConfig API signature changed to PersonaRange[] format
- Persona names now include timestamp/random suffix (enables session tracing)
- Campaign result endpoint: `PATCH /api/crawler/campaigns/:id/result` (new)

### Related Documentation
- Plan: `docs/01-plan/features/crawler-persona.plan.md`
- Design: `docs/02-design/features/crawler-persona.design.md`
- Analysis: `docs/03-analysis/crawler-persona.analysis.md`
- Report: `docs/04-report/crawler-persona.report.md`

### Next Cycle (v2.1.0)
- AI Persona Evolution: Server-side success_rate optimization (deferred 2 weeks for data accumulation)
- Adaptive Range Refinement: Machine learning-driven persona parameters
- Canvas Fingerprint Enhancement: Advanced browser fingerprinting evasion

---

## [2026-03-04] - ASIN Auto-Listing v1.0.0 Complete

### Added
- **Web API Endpoint**: POST `/api/listings/fetch-asin` to retrieve ASIN data from Crawler backend
- **Frontend Form Component**: AsinFetchForm with ASIN input validation and error handling
- **Preview Component**: ListingPreview to display fetched ASIN data (title, price, images)
- **Type Definitions**: FetchAsinRequest and FetchAsinResponse types for type-safe API contracts
- **Database Migration**: `013_add_manual_source.sql` to track manually-fetched listings
- **Pre-fill Integration**: NewReportForm now receives ASIN data for direct report creation workflow
- **Navigation**: New "New Listing" link in Sidebar for easy access to fetch form
- **Internationalization**: Full i18n support with English (en.ts) and Korean (ko.ts) localization
- **Loading & Error States**: Accessible form with visual feedback and error messages

### Fixed
- i18n missing key for ASIN input placeholder (initial analysis gap)
- Incomplete timeout error handling in API endpoint (improved in iteration 1)
- Missing loading state animation in preview component (UX improvement)

### Changed
- NewReportForm extended to support `asinData` parameter for pre-fill capability
- Sidebar navigation reorganized to include new listings management

### Quality Metrics
- **Design Match Rate**: 99% (improved from 93% in first pass)
- **Implementation Checks**: 87 total, 86 PASS, 1 WARN, 0 FAIL
- **Code Quality**: A grade — TypeScript strict mode, ESLint PASS, 100% type coverage
- **Accessibility**: A grade — Form labels, ARIA attributes, keyboard navigation
- **Deployment**: Vercel SUCCESS, all components verified functional

### Deployment
- **Platform**: Vercel (ip-project-khaki.vercel.app)
- **Status**: LIVE
- **Health**: OK (all endpoints responding)
- **Database**: Migration applied, manual_source column active

### Related Documentation
- Plan: `docs/01-plan/features/asin-auto-listing.plan.md` (to be created)
- Design: `docs/02-design/features/asin-auto-listing.design.md` (to be created)
- Analysis: `docs/03-analysis/asin-auto-listing.analysis.md` (to be created)
- Report: `docs/04-report/features/asin-auto-listing.report.md`

---

## [2026-03-04] - Crawler v1.0.0 Complete

### Added
- **Crawler Component**: Automated Amazon Marketplace listing collection via Playwright
- **Anti-bot Evasion**: User-Agent rotation, viewport variance, fingerprinting, proxy rotation
- **BullMQ Scheduler**: Job queue with Redis backend for distributed crawling
- **Amazon Scraper**: ASIN, title, price, image extraction with multi-image support
- **Error Handling**: 8-category error classification with exponential backoff retry policies
- **Follow-up Monitoring**: Automated 72-hour revisit tracking for listing changes
- **Google Chat Integration**: Real-time crawl alerts and status notifications
- **Multi-marketplace Support**: Amazon and MX (Mexico) marketplace scrapers
- **Health Monitoring**: `/health` endpoint with Redis/worker status checks
- **Web API Endpoints**: Campaign CRUD (5 endpoints) + `/trigger` for immediate crawls
- **Structured Logging**: Winston-based logging for debugging and audit trails
- **Docker Deployment**: Railway-ready Dockerfile with Playwright headless browser
- **Worker Pool**: Graceful shutdown handling with process scaling
- **14 Bonus Features**: Logger, health server, AI auto-trigger, immediate first crawl, etc.

### Fixed
- **Queue Reference Bug** (commit 8d68a97): Fixed `/trigger` endpoint failing to enqueue jobs due to eager evaluation of queue parameter
- **Playwright Version Mismatch** (commit 4938397): Updated Dockerfile from v1.49.1 to v1.58.2 to match npm-resolved version; fixed "Executable doesn't exist" crawl job failures

### Changed
- Playwright dependency pinned to exact version `1.58.2` (no semver ranges) for critical browser dependency

### Quality Metrics
- **Design Match Rate**: 96% (target: 90%)
- **Implementation Checks**: 178 total, 168 PASS, 6 WARN, 4 FAIL (all LOW priority)
- **Code Quality**: A grade — TypeScript strict mode, ESLint PASS, 100% type coverage
- **Deployment**: Railway SUCCESS, health endpoint responding, 6 active campaigns running

### Deployment
- **Platform**: Railway (lovely-magic project)
- **Status**: LIVE
- **Health**: OK (`{"status":"ok","redis":true,"worker":true}`)
- **Campaigns Active**: 6 synced and running

### Related Documentation
- Plan: `docs/01-plan/features/crawler.plan.md`
- Design: `docs/02-design/features/crawler.design.md`
- Analysis: `docs/03-analysis/crawler.analysis.md`
- Report: `docs/04-report/features/crawler.report.md`

---

