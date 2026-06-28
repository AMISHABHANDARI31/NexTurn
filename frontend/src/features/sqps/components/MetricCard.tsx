export function MetricCard({ label, value, detail, accent = false }: { label: string; value: string; detail: string; accent?: boolean }) {
  return <article className={`card p-5 ${accent ? 'bg-navy text-white' : ''}`}><p className={`text-sm font-semibold ${accent ? 'text-slate-300' : 'text-slate-500'}`}>{label}</p><p className="display mt-3 text-3xl font-bold">{value}</p><p className={`mt-2 text-xs ${accent ? 'text-mint' : 'text-slate-500'}`}>{detail}</p></article>
}
