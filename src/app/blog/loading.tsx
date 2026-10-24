export default function BlogListLoading() {
  return (
    <div className="bg-background" aria-busy="true" aria-label="Loading articles">
      <section className="bg-gradient-to-b from-muted to-background">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <div className="animate-pulse space-y-4 max-w-xl">
            <div className="h-7 w-40 rounded-full border border-border bg-card" />
            <div className="h-12 w-72 rounded-xl bg-card" />
            <div className="h-4 w-80 rounded bg-card" />
            <div className="flex gap-3 pt-2"><div className="h-12 w-40 rounded-full bg-card" /><div className="h-12 w-40 rounded-full border border-border bg-card" /></div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-[22px] border border-border bg-card overflow-hidden animate-pulse">
              <div className="aspect-[16/10] bg-muted" />
              <div className="p-5 space-y-3">
                <div className="h-3 w-24 rounded-full bg-muted" />
                <div className="h-5 w-full rounded bg-muted" />
                <div className="h-4 w-3/4 rounded bg-muted" />
                <div className="h-3 w-28 rounded bg-muted mt-4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
