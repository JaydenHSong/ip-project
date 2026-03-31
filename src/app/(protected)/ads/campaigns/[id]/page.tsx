// /ads/campaigns/[id] → M02 Campaign Detail or S09 Autopilot Detail
// Design Ref: §2.2 — Track A (Jayden)

const CampaignDetailPage = ({ params }: { params: Promise<{ id: string }> }) => {
  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-gray-900">Campaign Detail</h1>
      <p className="mt-2 text-sm text-gray-500">Coming soon — Track A</p>
    </div>
  )
}

export default CampaignDetailPage
