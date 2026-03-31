// /ads/autopilot/[id] → S09 Auto Pilot Detail
// Design Ref: §2.2 — Track C (PM2)

const AutopilotDetailPage = ({ params }: { params: Promise<{ id: string }> }) => {
  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-gray-900">Auto Pilot Detail</h1>
      <p className="mt-2 text-sm text-gray-500">Coming soon — Track C</p>
    </div>
  )
}

export default AutopilotDetailPage
