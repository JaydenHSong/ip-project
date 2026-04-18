-- Team-level unified budget: allow channel = 'total' (SP/SB/SD combined; autopilot included in plan semantics).
-- Run in Supabase SQL Editor before relying on team budget UI.

ALTER TABLE ads.budgets DROP CONSTRAINT IF EXISTS budgets_channel_check;

ALTER TABLE ads.budgets
  ADD CONSTRAINT budgets_channel_check
  CHECK (channel IN ('sp', 'sb', 'sd', 'total'));
