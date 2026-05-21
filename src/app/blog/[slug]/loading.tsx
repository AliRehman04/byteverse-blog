export default function BlogLoading() {
  return (
    <>
      {/* Hero skeleton */}
      <section className="bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] text-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-10 pb-16 md:pt-14 md:pb-20">
          <div className="space-y-4 animate-pulse">
            <div className="h-4 w-48 bg-white/10 rounded" />
            <div className="h-4 w-24 bg-white/10 rounded-full" />
            <div className="h-10 w-3/4 bg-white/10 rounded" />
            <div className="h-5 w-2/3 bg-white/10 rounded" />
            <div className="flex gap-4 pt-4">
              <div className="h-9 w-9 bg-white/10 rounded-full" />
              <div className="h-4 w-32 bg-white/10 rounded mt-2" />
            </div>
          </div>
        </div>
      </section>

      {/* Content skeleton */}
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <div className="animate-pulse space-y-6">
          <div className="aspect-video bg-muted rounded-2xl" />
          <div className="space-y-3">
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-5/6" />
            <div className="h-4 bg-muted rounded w-4/6" />
          </div>
          <div className="h-8 bg-muted rounded w-1/3 mt-8" />
          <div className="space-y-3">
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-5/6" />
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-full" />
          </div>
        </div>
      </div>
    </>
  );
}
