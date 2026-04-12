export default function WalletLoading() {
  return (
    <div className="max-w-2xl space-y-6 animate-pulse">
      {/* Balance card */}
      <div className="rounded-xl border border-line bg-bg-above/20 p-6 space-y-3">
        <div className="h-3 w-24 rounded bg-bg-above" />
        <div className="h-10 w-40 rounded-lg bg-bg-above" />
        <div className="h-3 w-32 rounded bg-bg-above/60" />
        <div className="flex gap-3 pt-2">
          <div className="h-10 flex-1 rounded-lg bg-bg-above" />
          <div className="h-10 flex-1 rounded-lg bg-bg-above" />
        </div>
      </div>

      {/* Transactions */}
      <div className="space-y-2">
        <div className="h-3 w-28 rounded bg-bg-above" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center justify-between p-3 border border-line rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-bg-above" />
              <div className="space-y-1.5">
                <div className="h-3 w-28 rounded bg-bg-above" />
                <div className="h-2.5 w-16 rounded bg-bg-above/60" />
              </div>
            </div>
            <div className="h-4 w-16 rounded bg-bg-above" />
          </div>
        ))}
      </div>
    </div>
  );
}
