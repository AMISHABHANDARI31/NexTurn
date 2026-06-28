export function InitialLoadingSkeleton() {
  return <div aria-label="Loading content" role="status" className="grid gap-4 md:grid-cols-3"><span className="sr-only">Loading...</span>{[1, 2, 3].map((item) => <div key={item} className="h-36 animate-pulse rounded-2xl bg-slate-200" />)}</div>
}
