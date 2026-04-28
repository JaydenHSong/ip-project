#!/usr/bin/env bash
# Design Ref: §8.4 Manual QA Checklist automation
# Plan SC: SC-04 (typecheck/lint/build green), SC-06 (Module Isolation)
#
# Usage:
#   bash tools/scripts/verify-products.sh
#
# Exits non-zero on any violation — suitable for CI.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

FAIL=0
PASS=0

log_ok() { printf "  \033[32m✓\033[0m %s\n" "$1"; PASS=$((PASS+1)); }
log_err() { printf "  \033[31m✗\033[0m %s\n" "$1"; FAIL=$((FAIL+1)); }
section() { printf "\n\033[1m%s\033[0m\n" "$1"; }

# =============================================================================
section "1. Module Isolation (NFR-05 / SC-06)"
# =============================================================================
# products/* 에서 ads/ip 모듈 import 금지
if grep -rn "from '@/modules/\(ads\|ip\)" src/modules/products src/app/api/products "src/app/(protected)/products" 2>/dev/null; then
  log_err "Module isolation violation — products imports ads/ip modules"
else
  log_ok "No @/modules/ads or @/modules/ip imports in products/**"
fi

# =============================================================================
section "2. Type Safety (NFR-07)"
# =============================================================================
if grep -rnE "^(export )?(interface|enum) " src/modules/products src/app/api/products "src/app/(protected)/products" 2>/dev/null; then
  log_err "interface / enum found — convention requires 'type' only"
else
  log_ok "No interface / enum (type-only convention)"
fi

if grep -rnE "(:|<)\s*any\b|\bany\[\]|as any" src/modules/products src/app/api/products "src/app/(protected)/products" 2>/dev/null; then
  log_err "'any' type usage found — use 'unknown' + type guards"
else
  log_ok "No 'any' usage"
fi

# =============================================================================
section "3. File Size (NFR-06: <=250 lines)"
# =============================================================================
OVER=$(
  find src/modules/products src/app/api/products "src/app/(protected)/products" tools/scripts -type f \
    \( -name '*.ts' -o -name '*.tsx' \) 2>/dev/null \
    | while read -r f; do
      n=$(wc -l < "$f")
      if [ "$n" -gt 250 ]; then
        echo "  $n  $f"
      fi
    done
)
if [ -n "$OVER" ]; then
  log_err "Files exceed 250 lines:"
  echo "$OVER"
else
  log_ok "All TS/TSX files <=250 lines"
fi

# =============================================================================
section "4. Client/Server Boundary"
# =============================================================================
# API routes + Server Components should NOT have 'use client'
BAD_SC=$(grep -l "^'use client'" \
  src/app/api/products/**/*.ts \
  "src/app/(protected)/products/page.tsx" \
  "src/app/(protected)/products/mapping/page.tsx" \
  "src/app/(protected)/products/[sku]/page.tsx" \
  2>/dev/null || true)
if [ -n "$BAD_SC" ]; then
  log_err "'use client' found in route.ts / page.tsx (should be server-side):"
  echo "$BAD_SC"
else
  log_ok "No 'use client' in api routes / server pages"
fi

# =============================================================================
section "5. Provider v1 Contract Fields (SC-07)"
# =============================================================================
TYPES_FILE="src/modules/products/shared/types.ts"
if [ -f "$TYPES_FILE" ]; then
  for field in sku productName brand category marketplace isPrimary status; do
    if grep -qE "^\s+$field:" "$TYPES_FILE"; then
      log_ok "ByAsinResponse.$field exists"
    else
      # Field might be in another type — narrow to ByAsinResponse block
      if awk '/ByAsinResponse = \{/,/^\};/' "$TYPES_FILE" | grep -qE "\s$field:"; then
        log_ok "ByAsinResponse.$field exists"
      else
        log_err "ByAsinResponse.$field missing — Provider v1 shape broken"
      fi
    fi
  done
else
  log_err "types.ts not found: $TYPES_FILE"
fi

# =============================================================================
section "6. DB Migration presence"
# =============================================================================
MIGRATION_FILE=""
for path in "docs/sql/010-products-schema.sql" "supabase/sql-migrations/010-products-schema.sql"; do
  [ -f "$path" ] && MIGRATION_FILE="$path" && break
done
if [ -n "$MIGRATION_FILE" ]; then
  log_ok "$MIGRATION_FILE exists"
  if grep -q "CREATE SCHEMA IF NOT EXISTS products" "$MIGRATION_FILE"; then
    log_ok "Schema creation statement present"
  else
    log_err "CREATE SCHEMA not found in migration"
  fi
else
  log_err "Migration file not found (checked docs/sql/ and supabase/sql-migrations/)"
fi

# =============================================================================
section "7. Feature Flag Status"
# =============================================================================
if [ -f "src/constants/modules.ts" ]; then
  if awk "/key: 'products'/,/menuItems:/" src/constants/modules.ts | grep -q "status: 'active'"; then
    log_ok "products module: status = 'active'"
  else
    log_err "products module is still 'coming_soon' — update required before Prod"
  fi
else
  log_err "src/constants/modules.ts not found"
fi

# =============================================================================
section "8. API Contract docs"
# =============================================================================
if [ -f "public/csv-template/products.csv" ]; then
  log_ok "CSV template ready (public/csv-template/products.csv)"
else
  log_err "CSV template missing"
fi

# =============================================================================
section "9. Products Sync Module (Clean Architecture)"
# =============================================================================
SYNC_ROOT="src/modules/products/features/sync"

# 9.1 Layer 4 Domain (pure)
for f in domain/types.ts domain/reasons.ts domain/normalize.ts domain/matcher.ts; do
  if [ -f "$SYNC_ROOT/$f" ]; then log_ok "sync/$f"
  else log_err "sync/$f missing"; fi
done

# 9.2 Layer 3 Adapters
for f in adapters/sq-datahub/client.ts adapters/sq-datahub/erp-source.ts adapters/sq-datahub/channel-source.ts \
         adapters/ip-project/products-sink.ts adapters/ip-project/channel-mapping-sink.ts \
         adapters/ip-project/queue-writer.ts adapters/ip-project/sync-runs-writer.ts \
         adapters/slack/notifier.ts; do
  if [ -f "$SYNC_ROOT/$f" ]; then log_ok "sync/$f"
  else log_err "sync/$f missing"; fi
done

# 9.3 Layer 2 Orchestrator
for f in orchestrator/pipeline.ts orchestrator/stage1-erp.ts orchestrator/stage2-channel-match.ts; do
  if [ -f "$SYNC_ROOT/$f" ]; then log_ok "sync/$f"
  else log_err "sync/$f missing"; fi
done

# 9.4 API routes
for f in src/app/api/products/sync/all/route.ts \
         src/app/api/products/unmapped/route.ts \
         src/app/api/products/unmapped/\[id\]/resolve/route.ts \
         src/app/api/products/unmapped/\[id\]/undo/route.ts \
         src/app/api/products/sku-search/route.ts; do
  # shellcheck disable=SC2086
  if [ -f $f ]; then log_ok "$f"
  else log_err "$f missing"; fi
done

# 9.5 UI page
if [ -f "src/app/(protected)/products/unmapped/page.tsx" ]; then
  log_ok "/products/unmapped page"
else
  log_err "/products/unmapped page missing"
fi

# 9.6 Migrations 012 + 013
for m in docs/sql/012-products-channel-mapping-rename.sql docs/sql/013-products-sync-tables.sql; do
  if [ -f "$m" ]; then log_ok "$m"
  else log_err "$m missing"; fi
done

# 9.7 Module isolation — sync MUST NOT import from modules/(ads|ip)
if grep -rn "from '@/modules/\(ads\|ip\)" "$SYNC_ROOT" 2>/dev/null; then
  log_err "sync module isolation violated — imports from ads/ip"
else
  log_ok "sync module isolation (no @/modules/ads|ip imports)"
fi

# 9.8 Type-only convention — no interface / enum / any
if grep -rnE "^(export )?(interface|enum) " "$SYNC_ROOT" 2>/dev/null; then
  log_err "sync uses interface/enum — type-only convention required"
else
  log_ok "sync: no interface/enum"
fi
if grep -rnE "(:|<)\s*any\b|\bany\[\]|as any" "$SYNC_ROOT" 2>/dev/null; then
  log_err "sync uses 'any'"
else
  log_ok "sync: no 'any'"
fi

# 9.9 File size ≤250
SYNC_OVER=$(
  find "$SYNC_ROOT" src/app/api/products/sync src/app/api/products/unmapped src/app/api/products/sku-search \
       -type f \( -name '*.ts' -o -name '*.tsx' \) 2>/dev/null \
    | while read -r f; do
      n=$(wc -l < "$f")
      if [ "$n" -gt 250 ]; then echo "  $n  $f"; fi
    done
)
if [ -n "$SYNC_OVER" ]; then
  log_err "sync files exceed 250 lines:"
  echo "$SYNC_OVER"
else
  log_ok "sync: all TS/TSX ≤ 250 lines"
fi

# 9.10 Vercel cron entry
if grep -q '"path": "/api/products/sync/all"' vercel.json 2>/dev/null; then
  log_ok "vercel.json products-sync cron registered"
else
  log_err "vercel.json missing products-sync cron entry"
fi

# =============================================================================
section "Summary"
# =============================================================================
printf "  Passed: \033[32m%d\033[0m  Failed: \033[31m%d\033[0m\n" "$PASS" "$FAIL"

if [ "$FAIL" -gt 0 ]; then
  printf "\n\033[31mFAIL\033[0m — %d check(s) failed\n" "$FAIL"
  exit 1
fi
printf "\n\033[32mPASS\033[0m — all checks green\n"
