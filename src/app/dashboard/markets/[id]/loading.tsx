export default function MarketDetailLoading() {
  return (
    <div className="max-w-4xl space-y-6 animate-pulse">
      <div className="h-4 w-52 rounded bg-bg-above" />

      <div className="space-y-3">
        <div className="h-6 w-2/3 rounded bg-bg-above" />
        <div className="grid grid-cols-3 gap-3">
          <div className="h-20 rounded-xl bg-bg-above" />
          <div className="h-20 rounded-xl bg-bg-above" />
          <div className="h-20 rounded-xl bg-bg-above" />
        </div>
      </div>

      <div className="h-72 rounded-2xl bg-bg-above" />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-3">
          <div className="h-4 w-32 rounded bg-bg-above" />
          <div className="h-24 rounded-xl bg-bg-above" />
          <div className="h-24 rounded-xl bg-bg-above" />
          <div className="h-24 rounded-xl bg-bg-above" />
        </div>
        <div className="lg:col-span-2">
          <div className="h-72 rounded-xl bg-bg-above" />
        </div>
      </div>
    </div>
  )
}
