-- Add DELETE RLS policy for reports table
-- Owner/Admin: can delete any report
-- Editor: can delete own draft/pending_review reports only

DROP POLICY IF EXISTS "reports_delete" ON reports;
CREATE POLICY "reports_delete" ON reports
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('owner', 'admin')
    )
    OR (
      reports.created_by = auth.uid()
      AND reports.status IN ('draft', 'pending_review')
    )
  );
