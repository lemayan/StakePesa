// Instant loading skeleton for the Overview (dashboard) page
// Shows immediately while getMyChallengeDashboardData() resolves
export default function DashboardLoading() {
  return (
    <div className="max-w-6xl space-y-8 animate-pulse">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-7 w-48 rounded-lg bg-bg-above" />
        <div className="h-4 w-72 rounded-md bg-bg-above/60" />
      </div>

      {/* Running challenges */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-3 w-20 rounded bg-bg-above" />
          <div className="h-8 w-28 rounded-md bg-bg-above" />
        </div>
        {[1, 2].map((i) => (
          <div key={i} className="border border-line rounded-lg p-4 space-y-3">
            <div className="h-5 w-3/4 rounded bg-bg-above" />
            <div className="h-3 w-1/2 rounded bg-bg-above/60" />
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((j) => (
                <div key={j} className="h-12 rounded border border-line bg-bg-above/40" />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Resolved */}
      <div className="space-y-3">
        <div className="h-3 w-16 rounded bg-bg-above" />
        <div className="border border-dashed border-line rounded-lg p-6">
          <div className="h-4 w-40 rounded bg-bg-above/50 mx-auto" />
        </div>
      </div>
    </div>
  );
}
