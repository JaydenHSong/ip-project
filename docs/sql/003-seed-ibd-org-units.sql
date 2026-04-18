-- iBD 조직 트리 시드 (public.org_units)
-- Budget Plan / 2026 조직도 기준: Department = 예산·잠금 단위 (level = department)
--
-- 실행: Supabase SQL Editor → 한 번에 실행 (여러 번 실행해도 상위 노드는 중복 생성 안 함)
-- 이후: Settings → Organization 에서 트리 확인, 사용자는 user_org_units 에 연결
--
-- 레벨 의미 (src/lib/org-units.ts 와 동일):
--   company → division → business_unit → department → team → unit

DO $$
DECLARE
  id_spigen   uuid;
  id_ibd      uuid;
  id_se       uuid;
  dept_names  text[] := ARRAY[
    'Phone Case US',
    'Screen Protector',
    'Tesla EV',
    'Canada / INT NARF',
    'Smart Device / US HUB',
    'LIFE',
    'CEM RISE',
    'Legato Golf',
    'Creative Lab',
    'WebD'
  ];
  d           text;
  sort_i      int := 0;
BEGIN
  -- 1) 회사 (Spigen)
  SELECT id INTO id_spigen
  FROM public.org_units
  WHERE level = 'company' AND name = 'Spigen' AND is_active = true
  LIMIT 1;

  IF id_spigen IS NULL THEN
    INSERT INTO public.org_units (name, level, parent_id, sort_order, is_active)
    VALUES ('Spigen', 'company', NULL, 0, true)
    RETURNING id INTO id_spigen;
  END IF;

  -- 2) 부문 iBD
  SELECT id INTO id_ibd
  FROM public.org_units
  WHERE level = 'division' AND name = 'iBD' AND parent_id = id_spigen AND is_active = true
  LIMIT 1;

  IF id_ibd IS NULL THEN
    INSERT INTO public.org_units (name, level, parent_id, sort_order, is_active)
    VALUES ('iBD', 'division', id_spigen, 0, true)
    RETURNING id INTO id_ibd;
  END IF;

  -- 3) Sub-Division (Smart Electronics — 2026 조직도)
  SELECT id INTO id_se
  FROM public.org_units
  WHERE level = 'business_unit' AND name = 'Smart Electronics' AND parent_id = id_ibd AND is_active = true
  LIMIT 1;

  IF id_se IS NULL THEN
    INSERT INTO public.org_units (name, level, parent_id, sort_order, is_active)
    VALUES ('Smart Electronics', 'business_unit', id_ibd, 0, true)
    RETURNING id INTO id_se;
  END IF;

  -- 4) Department (팀 예산 단위) — Budget Plan 행과 동일 이름
  FOREACH d IN ARRAY dept_names
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.org_units
      WHERE level = 'department'
        AND name = d
        AND parent_id = id_se
        AND is_active = true
    ) THEN
      INSERT INTO public.org_units (name, level, parent_id, sort_order, is_active)
      VALUES (d, 'department', id_se, sort_i, true);
    END IF;
    sort_i := sort_i + 1;
  END LOOP;
END $$;

-- 5) 사용자 연결 예시 (본인 user_id 로 교체 후 실행)
-- SELECT id, email FROM auth.users;
-- INSERT INTO public.user_org_units (user_id, org_unit_id, is_primary)
-- VALUES (
--   '<user-uuid>'::uuid,
--   (SELECT id FROM public.org_units WHERE name = 'Phone Case US' AND level = 'department' LIMIT 1),
--   true
-- )
-- ON CONFLICT DO NOTHING;
