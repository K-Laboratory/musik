function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md bg-slate-800/70 ${className}`}
    />
  );
}

export default function AlbumDesignLoading() {
  return (
    <div aria-busy="true" className="space-y-6">
      <span className="sr-only">Loading collection builder</span>
      <header className="space-y-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-9 w-72 max-w-full" />
        <Skeleton className="h-4 w-[34rem] max-w-full" />
        <Skeleton className="h-4 w-[28rem] max-w-full" />
      </header>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="space-y-5">
          <section className="space-y-5 rounded-xl border border-slate-800 p-4 sm:p-5">
            <div className="grid gap-2 sm:grid-cols-2">
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </div>
            <Skeleton className="h-4 w-40" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-8 w-24 rounded-full" />
              ))}
            </div>
            <Skeleton className="h-64 rounded-xl sm:h-72" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          </section>
          <Skeleton className="h-52 rounded-xl" />
        </div>
        <aside className="space-y-4">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-36 rounded-xl" />
        </aside>
      </div>
    </div>
  );
}
