-- 2026 iBD Marketing Budget Plan → ads.budgets (plan, channel = total)
-- Source: 2026 iBD Marketing Budget & Expense Analysis.xlsx — tab iBD Budget Plan
-- Skip row: iBD Total (rollup only).
--
-- Market rule (iBD):
--   - Canada / INT NARF → bm_ca (캐나다·NARF 등 비-US)
--   - 그 외 팀 → bm_us (US 마켓)
--
-- Before run:
--   1) docs/sql/002-alter-budgets-channel-total.sql applied
--   2) public.org_units: 팀명·level(department|business_unit) 일치
--   3) bm_us = US용 brand_markets.id, bm_ca = 캐나다 유닛용 brand_markets.id, cr = public.users.id

DO $$
DECLARE
  bm_us uuid := '00000000-0000-0000-0000-000000000001'::uuid;  -- TODO: US brand_market
  bm_ca uuid := '00000000-0000-0000-0000-000000000003'::uuid;  -- TODO: Canada / NARF brand_market
  cr uuid := '00000000-0000-0000-0000-000000000002'::uuid;  -- TODO: 실행자 users.id
  bm uuid;
BEGIN
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 1, 'total', 160000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Phone Case US' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 2, 'total', 165000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Phone Case US' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 3, 'total', 210000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Phone Case US' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 4, 'total', 180000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Phone Case US' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 5, 'total', 160000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Phone Case US' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 6, 'total', 150000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Phone Case US' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 7, 'total', 185000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Phone Case US' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 8, 'total', 210000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Phone Case US' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 9, 'total', 350000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Phone Case US' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 10, 'total', 300000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Phone Case US' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 11, 'total', 230000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Phone Case US' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 12, 'total', 200000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Phone Case US' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 1, 'total', 72000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Screen Protector' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 2, 'total', 67000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Screen Protector' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 3, 'total', 112000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Screen Protector' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 4, 'total', 72000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Screen Protector' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 5, 'total', 67000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Screen Protector' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 6, 'total', 67000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Screen Protector' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 7, 'total', 102000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Screen Protector' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 8, 'total', 102000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Screen Protector' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 9, 'total', 212000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Screen Protector' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 10, 'total', 172000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Screen Protector' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 11, 'total', 100000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Screen Protector' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 12, 'total', 105000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Screen Protector' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 1, 'total', 25000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Tesla EV' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 2, 'total', 25000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Tesla EV' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 3, 'total', 30000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Tesla EV' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 4, 'total', 30000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Tesla EV' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 5, 'total', 30000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Tesla EV' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 6, 'total', 35000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Tesla EV' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 7, 'total', 35000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Tesla EV' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 8, 'total', 30000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Tesla EV' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 9, 'total', 35000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Tesla EV' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 10, 'total', 40000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Tesla EV' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 11, 'total', 45000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Tesla EV' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 12, 'total', 40000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Tesla EV' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_ca;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 1, 'total', 23000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Canada / INT NARF' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_ca;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 2, 'total', 28000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Canada / INT NARF' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_ca;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 3, 'total', 10000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Canada / INT NARF' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_ca;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 4, 'total', 13000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Canada / INT NARF' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_ca;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 5, 'total', 14000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Canada / INT NARF' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_ca;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 6, 'total', 14000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Canada / INT NARF' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_ca;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 7, 'total', 18000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Canada / INT NARF' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_ca;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 8, 'total', 20000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Canada / INT NARF' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_ca;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 9, 'total', 61000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Canada / INT NARF' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_ca;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 10, 'total', 25000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Canada / INT NARF' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_ca;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 11, 'total', 17000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Canada / INT NARF' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_ca;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 12, 'total', 17000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Canada / INT NARF' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 1, 'total', 6000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Smart Device / US HUB' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 2, 'total', 12000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Smart Device / US HUB' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 3, 'total', 15000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Smart Device / US HUB' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 4, 'total', 10000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Smart Device / US HUB' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 5, 'total', 8000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Smart Device / US HUB' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 6, 'total', 8500.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Smart Device / US HUB' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 7, 'total', 8000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Smart Device / US HUB' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 8, 'total', 9000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Smart Device / US HUB' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 9, 'total', 7500.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Smart Device / US HUB' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 10, 'total', 12000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Smart Device / US HUB' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 11, 'total', 13000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Smart Device / US HUB' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 12, 'total', 11000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Smart Device / US HUB' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 1, 'total', 53376.48::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'LIFE' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 2, 'total', 53080.58::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'LIFE' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 3, 'total', 50734.67::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'LIFE' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 4, 'total', 44567.27::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'LIFE' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 5, 'total', 40811.36::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'LIFE' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 6, 'total', 41997.46::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'LIFE' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 7, 'total', 60827.64::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'LIFE' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 8, 'total', 59923.81::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'LIFE' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 9, 'total', 81594.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'LIFE' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 10, 'total', 72230.96::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'LIFE' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 11, 'total', 65649.02::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'LIFE' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 12, 'total', 65206.75::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'LIFE' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 1, 'total', 10200.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'CEM RISE' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 2, 'total', 15000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'CEM RISE' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 3, 'total', 24700.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'CEM RISE' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 4, 'total', 10600.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'CEM RISE' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 5, 'total', 9900.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'CEM RISE' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 6, 'total', 9800.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'CEM RISE' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 7, 'total', 21300.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'CEM RISE' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 8, 'total', 21100.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'CEM RISE' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 9, 'total', 44400.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'CEM RISE' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 10, 'total', 19500.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'CEM RISE' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 11, 'total', 21300.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'CEM RISE' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 12, 'total', 12200.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'CEM RISE' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 1, 'total', 7000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Legato Golf' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 2, 'total', 8400.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Legato Golf' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 3, 'total', 11000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Legato Golf' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 4, 'total', 12600.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Legato Golf' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 5, 'total', 13000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Legato Golf' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 6, 'total', 13500.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Legato Golf' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 7, 'total', 14000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Legato Golf' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 8, 'total', 13100.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Legato Golf' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 9, 'total', 13100.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Legato Golf' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 10, 'total', 12200.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Legato Golf' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 11, 'total', 13700.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Legato Golf' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 12, 'total', 8400.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Legato Golf' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 1, 'total', 15000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Creative Lab' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 2, 'total', 30000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Creative Lab' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 3, 'total', 15000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Creative Lab' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 4, 'total', 7500.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Creative Lab' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 5, 'total', 15000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Creative Lab' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 6, 'total', 10000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Creative Lab' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 7, 'total', 25000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Creative Lab' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 8, 'total', 25000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Creative Lab' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 9, 'total', 50000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Creative Lab' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 10, 'total', 40000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Creative Lab' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 11, 'total', 10000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Creative Lab' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 12, 'total', 7500.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'Creative Lab' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 1, 'total', 2000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'WebD' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 2, 'total', 2000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'WebD' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 3, 'total', 2000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'WebD' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 4, 'total', 1600.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'WebD' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 5, 'total', 1600.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'WebD' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 6, 'total', 2000.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'WebD' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 7, 'total', 1600.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'WebD' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 8, 'total', 1600.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'WebD' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 9, 'total', 1600.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'WebD' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 10, 'total', 1600.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'WebD' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 11, 'total', 1600.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'WebD' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
  bm := bm_us;
  INSERT INTO ads.budgets (org_unit_id, brand_market_id, year, month, channel, amount, is_actual, created_by)
  SELECT o.id, bm, 2026, 12, 'total', 1600.0::numeric, false, cr
  FROM public.org_units o
  WHERE o.name = 'WebD' AND o.level IN ('department', 'business_unit') AND o.is_active = true
  ORDER BY CASE WHEN o.level = 'business_unit' THEN 0 ELSE 1 END
  LIMIT 1
  ON CONFLICT (org_unit_id, brand_market_id, year, month, channel, is_actual)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();
END $$;