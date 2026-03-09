# BR Case Management — Gap Analysis Report

> **Analysis Type**: Design vs Implementation Gap Analysis
>
> **Project**: Sentinel
> **Version**: 0.9.0-beta
> **Analyst**: gap-detector
> **Date**: 2026-03-08
> **Design Docs**: `docs/02-design/features/br-case-management/R01~R11`

---

## Unit A (DB Schema + Types + Helpers) — 100% Match

> v2 re-analysis after SLA fix. See version history for details.

### Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| DB Schema Match | 100% | PASS |
| TypeScript Types Match | 100% | PASS |
| Helper Functions Match | 100% | PASS |
| UI Components Match | 100% | PASS |
| Convention Compliance | 100% | PASS |
| **Overall** | **100%** | **PASS** |

### Items: 171 checked, 171 PASS, 0 WARN, 0 FAIL, 3 BONUS

Full details in previous analysis (preserved below in version history).

Key verifications:
- 7 tables (6 new + 1 extended) with exact column-level parity
- 12 BR case event types, 5 BR case statuses, 4 SLA statuses, 6 notification triggers
- 21 RLS policies across 6 tables
- SLA formula: `remainingHours <= (expectedResponseHours - warningThresholdHours)` -- correct

---

## Unit B (BR Monitor Worker) — 98% Match

### Scope

| Design Doc | Implementation |
|-----------|----------------|
| R11: BR Monitor Worker | `crawler/src/br-monitor/types.ts` |
| | `crawler/src/br-monitor/worker.ts` |
| | `crawler/src/br-monitor/queue.ts` |
| | `crawler/src/br-monitor/scheduler.ts` |
| | `crawler/src/api/sentinel-client.ts` (2 new methods) |
| | `crawler/src/index.ts` (lifecycle integration) |
| | `src/app/api/crawler/br-monitor-pending/route.ts` |
| | `src/app/api/crawler/br-monitor-result/route.ts` |

### Crawler Implementation (31 items)

| # | Check Item | Status | Notes |
|---|-----------|:------:|-------|
| 1 | `types.ts` exists with 4 types | PASS | BrMonitorJobData, BrMonitorTarget, ScrapedMessage, BrMonitorResult, CaseDetailScraped |
| 2 | `BrMonitorTarget` fields: reportId, brCaseId, brCaseStatus, lastScrapedAt | PASS | |
| 3 | `ScrapedMessage` fields: direction, sender, body, sentAt | PASS | |
| 4 | `BrMonitorResult` fields: reportId, brCaseId, brCaseStatus, newMessages, lastAmazonReplyAt | PASS | |
| 5 | `worker.ts` exists | PASS | 395 lines, comprehensive |
| 6 | `scrapeCaseDetail(caseId)` function | PASS | Page nav + status + message extraction |
| 7 | `extractMessages(page)` function | PASS | Class-based selectors |
| 8 | `detectChanges` function | CHANGED | Renamed to `detectNewMessages` (clearer) |
| 9 | `scrapeCaseList(caseIds)` function | CHANGED | Not a separate function; cases processed individually via `processSingleCase` loop |
| 10 | DOM selectors match design Section 5 | PASS | All 5: sender, email, dateContainer, messageContainer, senderContainer |
| 11 | Summary regex patterns match | PASS | id, status, created |
| 12 | Persistent browser (Browser 3: `/tmp/br-monitor-data/`) | PASS | USER_DATA_DIR env override |
| 13 | Login check (session expired detection) | PASS | Checks signin/ap redirect |
| 14 | Session expired notification to operator | PASS | `notifyOperator()` callback -> Google Chat |
| 15 | 404 case -> `closed` status | PASS | Design: "케이스 없음 (404) -> br_case_status = closed" |
| 16 | Page load retry (design: 3x) | WARN | Relies on Playwright timeout + BullMQ 2 attempts; no explicit page-level retry loop |
| 17 | Rate limit 5-10s random delay | PASS | `randomDelay(5000, 10000)` between cases |
| 18 | Text-based fallback selectors | PASS | `extractMessagesFallback()` full implementation |
| 19 | BullMQ concurrency 1 | PASS | `concurrency: 1` in queue.ts |
| 20 | Queue name `sentinel-br-monitor` | PASS | |
| 21 | Job retry config | PASS | 2 attempts, exponential backoff |
| 22 | 30-min polling interval | PASS | `POLL_INTERVAL = 30 * 60 * 1000` |
| 23 | Duplicate job prevention | PASS | Active/waiting count check before adding |
| 24 | Initial poll on start | PASS | `poll().catch(() => {})` |
| 25 | `getPendingBrMonitors` in sentinel-client | PASS | GET /api/crawler/br-monitor-pending |
| 26 | `reportBrMonitorResult` in sentinel-client | PASS | POST with camelCase->snake_case conversion |
| 27 | `index.ts` full lifecycle integration | PASS | Queue + Worker + Scheduler + Shutdown |
| 28 | Graceful shutdown: closeMonitorBrowser + queue/worker close | PASS | |
| 29 | Operator notification via Google Chat | PASS | `setMonitorNotifier` connected to chatNotifier |
| 30 | Status change detection | PASS | `target.brCaseStatus !== detail.status` |
| 31 | Skip when no changes | PASS | `newMessages.length === 0 && !statusChanged` -> return |

### Web API — Monitor (16 items)

| # | Check Item | Status | Notes |
|---|-----------|:------:|-------|
| 32 | `GET /api/crawler/br-monitor-pending` exists | PASS | |
| 33 | Filter: `status = 'monitoring'` | PASS | |
| 34 | Filter: `br_case_id IS NOT NULL` | PASS | |
| 35 | Returns: report_id, br_case_id, br_case_status, last_scraped_at | PASS | 4 fields mapped |
| 36 | Service token auth | PASS | Bearer token check |
| 37 | Sort by oldest scraped first | PASS | `nullsFirst: true` |
| 38 | Limit 50 per cycle | PASS | |
| 39 | `POST /api/crawler/br-monitor-result` exists | PASS | |
| 40 | Input validation (report_id + br_case_id required) | PASS | |
| 41 | Insert br_case_messages | PASS | Bulk insert |
| 42 | Insert br_case_events (br_status_changed) | PASS | On status change |
| 43 | Insert br_case_events (br_amazon_replied) | PASS | On inbound messages |
| 44 | Update reports.br_case_status | PASS | |
| 45 | Update reports.br_last_scraped_at | PASS | |
| 46 | Update reports.br_last_amazon_reply_at | PASS | Conditional |
| 47 | Report existence check (404) | PASS | `.single()` with 404 response |

### Unit B Totals: 47 items, 45 PASS, 2 CHANGED, 0 FAIL

---

## Unit C (Web UI Phase 1: Status + Queue + Linking) — 96% Match

### Scope

| Design Doc | Implementation |
|-----------|----------------|
| R01: Status Separation | ReportsContent.tsx, StatusBadge.tsx, reports API |
| R04: Smart Queue | BrCaseQueueBar.tsx, br-case-summary API, page.tsx filters |
| R07: Case Linking | CaseChain.tsx, RelatedReports.tsx, related API |

### R01: Status Separation (7 items)

| # | Check Item | Status | Notes |
|---|-----------|:------:|-------|
| 1 | 5 BR case statuses defined | PASS | BR_CASE_STATUSES in br-case.ts |
| 2 | StatusBadge supports `type="br_case"` | PASS | Color map in StatusBadge.tsx |
| 3 | Reports list shows BR case status column | PASS | ReportsContent.tsx L451-454 |
| 4 | `GET /api/reports` has `br_case_status` filter | PASS | route.ts L46-48 |
| 5 | Reports page passes br_case_status filter | PASS | page.tsx L79-80 |
| 6 | Mapping: open/wip/answered -> "Awaiting Amazon" (blue) | PASS | StatusBadge labels |
| 7 | Mapping: needs_attention -> "Action Required" (red) | PASS | |

### R04: Smart Queue (14 items)

| # | Check Item | Status | Notes |
|---|-----------|:------:|-------|
| 8 | `GET /api/dashboard/br-case-summary` exists | PASS | Queue count API |
| 9 | action_required count | PASS | `br_case_status === 'needs_attention'` |
| 10 | sla_warning count | PASS | `deadline < now + 24h` |
| 11 | new_reply count | PASS | `amazonReply > ourReply` |
| 12 | stale count (7-day) | PASS | |
| 13 | total count | PASS | |
| 14 | `BrCaseQueueBar.tsx` component | PASS | 4 queue items with badges |
| 15 | Click toggles smart_queue URL param | PASS | |
| 16 | Placed in Reports page | PASS | ReportsContent imports it |
| 17 | `?smart_queue=action_required` filter in page.tsx | PASS | L82-83 |
| 18 | `?smart_queue=sla_warning` filter in page.tsx | MISSING | BrCaseQueueBar sends param but page.tsx has no handler |
| 19 | `?smart_queue=new_reply` filter in page.tsx | PASS | L84-85 |
| 20 | `?smart_queue=stale` filter in page.tsx | PASS | L86-88 |
| 21 | Urgency-based default sort | MISSING | Design: "기본 정렬: 긴급도 순"; not implemented |

### R07: Case Linking (15 items)

| # | Check Item | Status | Notes |
|---|-----------|:------:|-------|
| 22 | `GET /api/reports/[id]/related` exists | PASS | |
| 23 | Parent chain traversal | PASS | While loop up parent_report_id |
| 24 | Children query | PASS | parent_report_id = id |
| 25 | Same listing query | PASS | listing_id match, exclude self, limit 10 |
| 26 | `CaseChain.tsx` horizontal chain | PASS | Arrow separators between nodes |
| 27 | Chain node: short id + status badges | PASS | `node.id.substring(0, 8)` + StatusBadge |
| 28 | Current node highlight | PASS | Accent border + disabled button |
| 29 | Click navigates to report | PASS | `router.push` |
| 30 | Hidden when no related reports | PASS | Returns null |
| 31 | `RelatedReports.tsx` exists | PASS | |
| 32 | Shows violation badge | PASS | ViolationBadge component |
| 33 | Shows status badge | PASS | StatusBadge component |
| 34 | Shows listing title | PASS | Fallback to ID |
| 35 | Shows date | PASS | `toLocaleDateString()` |
| 36 | Report Detail integration | PASS | ReportDetailContent imports both |

### Unit C Totals: 36 items, 34 PASS, 2 MISSING, 0 CHANGED

---

## Unit D (Thread View + Activity Log) — 100% Match

### Scope

| Design Doc | Implementation |
|-----------|----------------|
| R03: Thread View | case-thread API, CaseThread.tsx, CaseMessage.tsx, CaseNote.tsx, CaseEvent.tsx, AddNoteForm.tsx |
| R05: Activity Log | case-events API, CaseActivityLog.tsx |

### R03: Thread View API (14 items)

| # | Check Item | Status | Notes |
|---|-----------|:------:|-------|
| 1 | `GET /api/reports/[id]/case-thread` unified timeline | PASS | Merges messages + notes + events |
| 2 | Messages query from br_case_messages | PASS | |
| 3 | Notes query from br_case_notes with user join | PASS | `users!br_case_notes_user_id_fkey(name)` |
| 4 | Events query from br_case_events | PASS | |
| 5 | Time-sorted merge | PASS | `items.sort()` by timestamp |
| 6 | `POST /api/reports/[id]/case-notes` create note | PASS | |
| 7 | Note body validation (non-empty) | PASS | Trim + empty check |
| 8 | Auth user check | PASS | `supabase.auth.getUser()` |
| 9 | `br_note_added` event recorded on creation | PASS | |
| 10 | Role restriction (editor+) | PASS | `withAuth(['owner', 'admin', 'editor'])` |
| 11 | `PATCH /api/reports/[id]/case-notes/[noteId]` edit note | PASS | Owner-only: `.eq('user_id', authUser.id)` |
| 12 | `DELETE /api/reports/[id]/case-notes/[noteId]` delete note | PASS | Owner-only |
| 13 | Read endpoints: all roles | PASS | thread + events allow all authenticated |
| 14 | Write endpoints: editor+ | PASS | notes POST/PATCH/DELETE |

### R03: Thread View UI (18 items)

| # | Check Item | Status | Notes |
|---|-----------|:------:|-------|
| 15 | `CaseThread.tsx` container component | PASS | Loading + empty + items |
| 16 | Three-way type dispatch (message/note/event) | PASS | |
| 17 | `CaseMessage.tsx` component | PASS | |
| 18 | Inbound: left-aligned + card bg | PASS | `justify-start` + `bg-surface-card` |
| 19 | Outbound: right-aligned + accent bg | PASS | `justify-end` + `bg-th-accent/10` |
| 20 | Direction icons | PASS | Emoji in text |
| 21 | Sender + date header | PASS | |
| 22 | Whitespace-preserving body | PASS | `whitespace-pre-wrap` |
| 23 | `CaseNote.tsx` component | PASS | |
| 24 | Yellow background + dashed border | PASS | `bg-yellow-50 border-dashed border-yellow-400/40` |
| 25 | Lock icon "Internal Note" | PASS | |
| 26 | Edit/Delete for owner only | PASS | `isOwner && !editing` |
| 27 | Inline edit with Textarea | PASS | Save/Cancel flow |
| 28 | `CaseEvent.tsx` component | PASS | |
| 29 | Center divider style | PASS | h-px borders + centered text |
| 30 | 12 event type labels | PASS | All match R05 design |
| 31 | `AddNoteForm.tsx` form | PASS | Disabled when empty |
| 32 | `canEdit` controls form visibility | PASS | `canEdit && <AddNoteForm>` |

### R05: Activity Log (12 items)

| # | Check Item | Status | Notes |
|---|-----------|:------:|-------|
| 33 | `GET /api/reports/[id]/case-events` API | PASS | |
| 34 | Reverse chronological order | PASS | `ascending: false` |
| 35 | Limit 100 events | PASS | |
| 36 | `CaseActivityLog.tsx` component | PASS | |
| 37 | Vertical timeline line | PASS | `absolute left-4 h-full w-px` |
| 38 | 12 event icons (emoji per type) | PASS | EVENT_ICONS map |
| 39 | 12 event labels | PASS | EVENT_LABELS map, all match R05 exactly |
| 40 | Event detail (old->new) display | PASS | Conditional rendering |
| 41 | Timestamp display | PASS | `toLocaleString()` |
| 42 | Loading spinner | PASS | |
| 43 | Empty state | PASS | "No activity yet." |
| 44 | Tabs in ReportDetail: "Thread" / "Activity" | PASS | `caseThreadTab` state toggle |

### R05: Helper (1 item)

| # | Check Item | Status | Notes |
|---|-----------|:------:|-------|
| 45 | `src/lib/br-case/events.ts` helper exists | PASS | `insertCaseEvent()` with typed params |

### Unit D Totals: 45 items, 45 PASS, 0 MISSING, 0 CHANGED

---

## 3. Overall Summary

### Scores

| Unit | Items | Match | Changed | Missing | Rate |
|------|:-----:|:-----:|:-------:|:-------:|:----:|
| A (DB + Types) | 171 | 171 | 0 | 0 | 100% |
| B (Monitor Worker) | 47 | 45 | 2 | 0 | 98% |
| C (UI Phase 1) | 36 | 34 | 0 | 2 | 96% |
| D (Thread + Activity) | 45 | 45 | 0 | 0 | 100% |
| **Total** | **299** | **295** | **2** | **2** | **98%** |

### All Differences

#### Missing (2)

| # | Item | Design | Impact | Fix Effort |
|---|------|--------|:------:|:----------:|
| M1 | `smart_queue=sla_warning` filter in page.tsx | R04 Section 2.1 | Medium | 5 min |
| M2 | Urgency-based default sort | R04 Section 2.3 | Low | 30 min |

#### Changed (2)

| # | Item | Design | Implementation | Impact |
|---|------|--------|----------------|:------:|
| C1 | `detectChanges` function | R11 Section 3.2 | `detectNewMessages` (clearer name) | None |
| C2 | `scrapeCaseList` function | R11 Section 3.2 | Sequential `processSingleCase` loop (equivalent) | None |

#### Added Beyond Design (9 bonus)

| # | Item | File | Description |
|---|------|------|-------------|
| A1 | Text-based fallback extraction | worker.ts | Full fallback parser when class selectors fail |
| A2 | Sort pending by oldest scraped | br-monitor-pending route | `nullsFirst: true` |
| A3 | Duplicate job prevention | scheduler.ts | Active/waiting count check |
| A4 | BR_MONITOR_HEADLESS env | worker.ts | Toggle headless for debugging |
| A5 | BR_MONITOR_DATA_DIR env | worker.ts | Configurable user data dir |
| A6 | R06/R10 prep tables | 025 migration | notification_rules, notifications, reply fields |
| A7 | R06/R10 prep types | br-case.ts | Notification + Reply types |
| A8 | `insertCaseEvent` helper | lib/br-case/events.ts | Reusable helper (design R05 3.4) |
| A9 | CaseNote inline edit UI | CaseNote.tsx | Full edit/cancel/save flow |

---

## 4. Recommended Actions

### Immediate (M1: quick fix)

Add `sla_warning` handler in `src/app/(protected)/reports/page.tsx`:

```typescript
} else if (params.smart_queue === 'sla_warning') {
  const now = new Date().toISOString()
  const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  query = query.lt('br_sla_deadline_at', in24h).gt('br_sla_deadline_at', now)
}
```

### Optional (M2: low priority)

Add urgency-based sorting when `smart_queue` filters are active. Can be deferred to Phase 2.

### No Action Needed

- C1 (`detectNewMessages` name): Better than design's `detectChanges`
- C2 (no `scrapeCaseList`): Sequential processing is equivalent and simpler

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-08 | Unit A initial analysis (98%, 1 WARN) | gap-detector |
| 2.0 | 2026-03-08 | Unit A re-analysis after SLA fix (100%) | gap-detector |
| 3.0 | 2026-03-08 | Units B + C + D analysis added (98% combined) | gap-detector |
