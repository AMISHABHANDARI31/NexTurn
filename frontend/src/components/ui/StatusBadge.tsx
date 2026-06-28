type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'
export function StatusBadge({ children, tone = 'neutral', dot = true }: { children: React.ReactNode; tone?: Tone; dot?: boolean }) {
  const styles = { success: 'bg-emerald-50 text-emerald-800', warning: 'bg-amber-50 text-amber-800', danger: 'bg-red-50 text-red-800', info: 'bg-sky-50 text-sky-800', neutral: 'bg-slate-100 text-slate-700' }
  const dots = { success: 'bg-emerald-500', warning: 'bg-amber-500', danger: 'bg-red-500', info: 'bg-sky-500', neutral: 'bg-slate-400' }
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${styles[tone]}`}>{dot && <span className={`h-1.5 w-1.5 rounded-full ${dots[tone]}`} aria-hidden="true"/>}{children}</span>
}
