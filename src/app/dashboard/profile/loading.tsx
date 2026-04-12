export default function ProfileLoading() {
  return (
    <div className="max-w-xl space-y-6 animate-pulse">
      {/* Avatar + name */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-bg-above" />
        <div className="space-y-2">
          <div className="h-5 w-32 rounded bg-bg-above" />
          <div className="h-3 w-48 rounded bg-bg-above/60" />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border border-line p-3 space-y-1.5">
            <div className="h-3 w-12 rounded bg-bg-above/60" />
            <div className="h-5 w-8 rounded bg-bg-above" />
          </div>
        ))}
      </div>

      {/* Form fields */}
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-3 w-16 rounded bg-bg-above/60" />
            <div className="h-10 w-full rounded-lg bg-bg-above" />
          </div>
        ))}
      </div>
    </div>
  );
}
