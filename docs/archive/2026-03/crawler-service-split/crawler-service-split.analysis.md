# crawler-service-split Analysis Report

> **Analysis Type**: Gap Analysis (Phase A + Phase B Combined)
>
> **Project**: Sentinel
> **Version**: 0.9.0-beta
> **Analyst**: gap-detector
> **Date**: 2026-03-13
> **Design Doc**: [crawler-service-split.design.md](../02-design/features/crawler-service-split.design.md)
> **Scope**: Phase A (Service Split) + Phase B (PD Followup Removal)

---

## 1. Analysis Overview

### 1.1 Analysis Purpose

Verify Phase A (Service Split) and Phase B (PD Followup Removal) implementation against design document. Phase C (Health Monitor) and Phase D (Google Chat Bot) are infrastructure/future phases excluded from this code-level analysis.

### 1.2 Analysis Scope

- **Design Document**: `docs/02-design/features/crawler-service-split.design.md` (Sections 2-3)
- **Implementation Files**:
  - `crawler/src/config.ts` (A1)
  - `crawler/src/entry-crawl.ts` (A2)
  - `crawler/src/entry-br.ts` (A3)
  - `crawler/src/index.ts` (A4)
  - `crawler/src/entry-all.ts` (adaptation -- extracted monolith)
  - `crawler/src/api/sentinel-client.ts` (B3)
  - `crawler/src/pd-followup/` (B1 -- deletion verified)
  - `src/app/api/crawler/pd-followup-pending/` (B4 -- deletion verified)
  - `src/app/api/crawler/pd-followup-result/` (B5 -- deletion verified)
  - `src/app/api/crawler/logs/route.ts` (log type cleanup)
- **Infrastructure**: Railway sentinel-crawl + sentinel-br services (verified running)

---

## 2. Phase A Gap Analysis (Design vs Implementation)

### A1: `crawler/src/config.ts` -- MODIFY

| Item | Design | Implementation | Status |
|------|--------|----------------|--------|
| `ServiceType` type | `'crawl' \| 'br' \| 'all'` | `'crawl' \| 'br' \| 'all'` (L27) | PASS |
| `loadConfig(service?)` parameter | `service?: ServiceType` | `service?: ServiceType` (L29) | PASS |
| `browserWs` conditional (br) | `process.env[...] ?? ''` | `process.env['BRIGHTDATA_BROWSER_WS'] ?? ''` (L44) | PASS |
| `browserWs` conditional (crawl/all) | `check('BRIGHTDATA_BROWSER_WS')` | `check('BRIGHTDATA_BROWSER_WS')` (L44) | PASS |
| Export `ServiceType` | Implied | `export type { CrawlerConfig, ServiceType }` (L68) | PASS |
| Other fields unchanged | Same | Same | PASS |

**A1 Score: 6/6 (100%)**

---

### A2: `crawler/src/entry-crawl.ts` -- NEW

| # | Design Requirement | Implementation | Status |
|---|-------------------|----------------|--------|
| 1 | `loadConfig('crawl')` | L49: `loadConfig('crawl')` | PASS |
| 2 | BRIGHTDATA_BROWSER_WS required | Via `loadConfig('crawl')` -> `check()` | PASS |
| 3 | SentinelClient created | L50: `createSentinelClient(...)` | PASS |
| 4 | ChatNotifier created | L51: `createChatNotifier(...)` | PASS |
| 5 | VisionAnalyzer created | L26-28: `createVisionAnalyzer(...)` | PASS |
| 6 | Health server with `/health`, `/trigger`, `/fetch`, `/diag/browser` | L30-44: queue, browserWs, vision passed | PASS |
| 7 | Crawl Queue + Worker + Scheduler | L59-67: all three initialized | PASS |
| 8 | Heartbeat `['Crawl Worker']` | L89 | PASS |
| 9 | Daily report (Crawl queue only) | L93-114: single queue report | PASS |
| 10 | Worker error alert | L79-86 | PASS |
| 11 | Graceful shutdown | L117-133: SIGTERM/SIGINT | PASS |

**A2 Score: 11/11 (100%)**

---

### A3: `crawler/src/entry-br.ts` -- NEW

| # | Design Requirement | Implementation | Status |
|---|-------------------|----------------|--------|
| 1 | `loadConfig('br')` | L43 | PASS |
| 2 | No BRIGHTDATA_BROWSER_WS required | Via `loadConfig('br')` -> optional | PASS |
| 3 | No VisionAnalyzer | Not imported | PASS |
| 4 | SentinelClient + ChatNotifier | L44-45 | PASS |
| 5 | Health server: `/health` only (no queue/browserWs/vision) | L27-38 | PASS |
| 6 | BR Submit Queue + Worker + Scheduler | L50-60 | PASS |
| 7 | BR Monitor Queue + Worker + Scheduler + `setMonitorNotifier` | L63-77 | PASS |
| 8 | BR Reply Queue + Worker + Scheduler + `setBrowserPageAccessor` | L80-94 | PASS |
| 9 | Heartbeat `['BR Submit Worker', 'BR Monitor Worker', 'BR Reply Worker']` | L120-124 | PASS |
| 10 | Daily report (3 BR queues) | L130-152 | PASS |
| 11 | Worker error alerts (3 workers) | L106-117 | PASS |
| 12 | Graceful shutdown | L160-184 | PASS |

**A3 Score: 12/12 (100%)**

---

### A4: `crawler/src/index.ts` -- MODIFY

| # | Design Requirement | Implementation | Status | Notes |
|---|-------------------|----------------|--------|-------|
| 1 | `SENTINEL_SERVICE` env var read | L5: `process.env['SENTINEL_SERVICE'] ?? 'all'` | PASS | |
| 2 | `crawl` -> import entry-crawl | L8: `await import('./entry-crawl.js')` | PASS | |
| 3 | `br` -> import entry-br | L10: `await import('./entry-br.js')` | PASS | |
| 4 | `all` -> monolith fallback | L12: `await import('./entry-all.js')` | PASS | Adaptation |

**A4 Note**: Design says `else { init().catch(...) }` inline. Implementation extracts monolith to `entry-all.ts` and uses dynamic import. This is a correct structural adaptation for ES module top-level `await` -- not a functional gap.

**A4 Score: 4/4 (100%)**

---

### A5-A6: Railway Infrastructure

| # | Design Requirement | Status |
|---|-------------------|--------|
| 1 | sentinel-br service created | PASS |
| 2 | sentinel-crawl has SENTINEL_SERVICE=crawl | PASS |
| 3 | Both services running successfully | PASS |

**A5-A6 Score: 3/3 (100%)**

---

## 3. Phase B Gap Analysis (PD Followup Removal)

### B1: Delete `crawler/src/pd-followup/*` (4 files)

| File | Status | Verification |
|------|--------|--------------|
| `crawler/src/pd-followup/queue.ts` | DELETED | Directory does not exist (glob confirmed) |
| `crawler/src/pd-followup/worker.ts` | DELETED | Directory does not exist |
| `crawler/src/pd-followup/scheduler.ts` | DELETED | Directory does not exist |
| `crawler/src/pd-followup/types.ts` | DELETED | Directory does not exist |

**B1 Score: 4/4 (100%)**

---

### B2: Modify `crawler/src/index.ts` -- Remove PD import/init

| Item | Status | Verification |
|------|--------|--------------|
| No PD imports in `index.ts` | PASS | 13-line clean router, zero PD references |
| No PD imports in `entry-all.ts` | PASS | grep confirms zero pd-followup references |
| No PD imports in `entry-crawl.ts` | PASS | No PD references |
| No PD imports in `entry-br.ts` | PASS | No PD references |

**B2 Score: 4/4 (100%)**

---

### B3: Modify `crawler/src/api/sentinel-client.ts` -- Remove PD methods

| Item | Status | Verification |
|------|--------|--------------|
| `getPendingFollowups()` removed | PASS | Not in SentinelClient type or implementation |
| `reportFollowupResult()` removed | PASS | Not in SentinelClient type or implementation |
| `PdFollowupResultData` type removed | PASS | Not present in file |
| No pd-followup references remain | PASS | grep confirms zero matches in crawler/src/ |

**B3 Score: 4/4 (100%)**

---

### B4: Delete `src/app/api/crawler/pd-followup-pending/route.ts`

| Item | Status | Verification |
|------|--------|--------------|
| Route file deleted | PASS | Directory does not exist (glob confirmed) |

**B4 Score: 1/1 (100%)**

---

### B5: Delete `src/app/api/crawler/pd-followup-result/route.ts`

| Item | Status | Verification |
|------|--------|--------------|
| Route file deleted | PASS | Directory does not exist (glob confirmed) |

**B5 Score: 1/1 (100%)**

---

## 4. Additional Verification

### Log type cleanup (`src/app/api/crawler/logs/route.ts`)

| Item | Status | Verification |
|------|--------|--------------|
| `pd_followup` removed from `VALID_LOG_TYPES` | PASS | Not in array (L6-16) |

### Residual PD followup references in codebase

| Location | Content | Expected? | Status |
|----------|---------|-----------|--------|
| `src/types/reports.ts:112` | `pd_followup_interval_days: number \| null` | Yes -- DB column still exists | PASS |
| `src/app/api/reports/[id]/route.ts:82` | `'pd_followup_interval_days'` in select | Yes -- DB column still exists | PASS |
| `crawler/src/**/*.ts` | Zero pd-followup references | Expected | PASS |

**Additional Score: 4/4 (100%)**

---

## 5. Shared Utilities Verification

| Utility | Design Says | Implementation | Status |
|---------|------------|----------------|--------|
| `createHealthServer` | No changes needed | No changes made | PASS |
| `createHeartbeatMonitor` | No changes needed | No changes made | PASS |
| `createSentinelClient` | PD methods removed | PD methods removed | PASS |
| `createChatNotifier` | Used by both entries | Used by both | PASS |
| `loadConfig` | Signature change only | Signature changed, backward compatible | PASS |
| `log` | No changes | No changes | PASS |

---

## 6. Overall Scores

| Category | Items | Pass | Fail | Score | Status |
|----------|:-----:|:----:|:----:|:-----:|:------:|
| A1: config.ts | 6 | 6 | 0 | 100% | PASS |
| A2: entry-crawl.ts | 11 | 11 | 0 | 100% | PASS |
| A3: entry-br.ts | 12 | 12 | 0 | 100% | PASS |
| A4: index.ts | 4 | 4 | 0 | 100% | PASS |
| A5-A6: Railway infra | 3 | 3 | 0 | 100% | PASS |
| **Phase A Total** | **36** | **36** | **0** | **100%** | **PASS** |
| B1: pd-followup deletion | 4 | 4 | 0 | 100% | PASS |
| B2: index.ts PD removal | 4 | 4 | 0 | 100% | PASS |
| B3: sentinel-client PD removal | 4 | 4 | 0 | 100% | PASS |
| B4: pd-followup-pending API | 1 | 1 | 0 | 100% | PASS |
| B5: pd-followup-result API | 1 | 1 | 0 | 100% | PASS |
| **Phase B Total** | **14** | **14** | **0** | **100%** | **PASS** |
| Additional checks | 4 | 4 | 0 | 100% | PASS |
| **Grand Total** | **54** | **54** | **0** | **100%** | **PASS** |

```
+---------------------------------------------+
|  Combined Match Rate: 100% (54/54)           |
+---------------------------------------------+
|  Phase A: 100% (36/36)                       |
|  Phase B: 100% (14/14)                       |
|  Additional: 100% (4/4)                      |
+---------------------------------------------+
|  Design Match:           100%   PASS         |
|  Architecture Compliance: 100%  PASS         |
|  Convention Compliance:   100%  PASS         |
+---------------------------------------------+
```

---

## 7. Differences Found

### Missing Features (Design O, Implementation X)

None.

### Added Features (Design X, Implementation O)

| Item | Implementation Location | Description |
|------|------------------------|-------------|
| `entry-all.ts` extraction | `crawler/src/entry-all.ts` | Monolith code extracted to separate file instead of inline in index.ts else block. Improvement over design. |

### Changed Features (Design != Implementation)

| Item | Design | Implementation | Impact |
|------|--------|----------------|--------|
| Monolith fallback | `init().catch(...)` inline in index.ts | `import('./entry-all.js')` dynamic import | Low (improvement) |

---

## 8. Phases Not Yet Implemented (future work, not scored)

| Phase | Description | Status |
|-------|-------------|--------|
| C | Health Monitor (Vercel Cron + Railway API) | Not started |
| D | Google Chat Bot (Chat App + commands) | Not started |

---

## 9. Recommended Actions

### None Required

Phase A + Phase B are complete with 100% combined match rate. The single adaptation (entry-all.ts extraction) is an improvement, not a regression.

### Design Document Update

- [ ] Minor: Update design Section 2.1 to reflect `entry-all.ts` extraction pattern

### Next Steps

1. Write completion report (`/pdca report crawler-service-split`)
2. Phase C/D implementation (separate PDCA cycle when ready)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-13 | Phase A analysis | gap-detector |
| 2.0 | 2026-03-13 | Combined Phase A + B analysis | gap-detector |
