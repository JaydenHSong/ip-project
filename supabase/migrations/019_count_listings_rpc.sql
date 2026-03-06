-- RPC: 캠페인 ID 배열로 각 캠페인별 listings count 조회
CREATE OR REPLACE FUNCTION count_listings_by_campaigns(campaign_ids UUID[])
RETURNS TABLE(source_campaign_id UUID, cnt BIGINT)
LANGUAGE sql STABLE
AS $$
  SELECT l.source_campaign_id, COUNT(*) AS cnt
  FROM listings l
  WHERE l.source_campaign_id = ANY(campaign_ids)
  GROUP BY l.source_campaign_id;
$$;
