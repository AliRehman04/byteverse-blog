export default function BlogListLoading() {
  return (
    <>
      <section className="bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <div className="animate-pulse space-y-3">
            <div className="h-4 w-20 bg-white/10 rounded-full" />
            <div className="h-10 w-64 bg-white/10 rounded" />
            <div className="h-4 w-80 bg-white/10 rounded" />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden animate-pulse">
              <div className="aspect-[16/10] bg-muted" />
              <div className="p-6 space-y-3">
                <div className="h-3 w-24 bg-muted rounded" />
                <div className="h-5 w-full bg-muted rounded" />
                <div className="h-4 w-3/4 bg-muted rounded" />
                <div className="h-3 w-20 bg-muted rounded mt-4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
