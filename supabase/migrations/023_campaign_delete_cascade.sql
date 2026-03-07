-- 1. reports에 listing_snapshot 컬럼 추가
ALTER TABLE reports ADD COLUMN IF NOT EXISTS listing_snapshot JSONB;

-- 2. reports.listing_id NOT NULL 제약 해제
ALTER TABLE reports ALTER COLUMN listing_id DROP NOT NULL;

-- 3. listings.source_campaign_id에 ON DELETE SET NULL 추가
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_source_campaign_id_fkey;
ALTER TABLE listings ADD CONSTRAINT listings_source_campaign_id_fkey
  FOREIGN KEY (source_campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL;

-- 4. RPC 함수: 캠페인 삭제 cascade (트랜잭션 보장)
CREATE OR REPLACE FUNCTION delete_campaign_cascade(p_campaign_id UUID)
RETURNS void AS $$
DECLARE
  v_listing_ids UUID[];
BEGIN
  -- 리스팅 ID 수집
  SELECT array_agg(id) INTO v_listing_ids
  FROM listings WHERE source_campaign_id = p_campaign_id;

  IF v_listing_ids IS NOT NULL THEN
    -- 리포트에 스냅샷 복사 + listing_id NULL
    UPDATE reports r SET
      listing_snapshot = to_jsonb(l.*) - 'id' - 'created_at' - 'updated_at',
      listing_id = NULL
    FROM listings l
    WHERE r.listing_id = l.id
      AND l.id = ANY(v_listing_ids);

    -- 리스팅 삭제
    DELETE FROM listings WHERE id = ANY(v_listing_ids);
  END IF;

  -- 캠페인 삭제
  DELETE FROM campaigns WHERE id = p_campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. campaigns_delete RLS 정책 (없으면 추가)
DROP POLICY IF EXISTS "campaigns_delete" ON campaigns;
CREATE POLICY "campaigns_delete" ON campaigns
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin'))
  );
