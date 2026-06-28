import { AlertTriangle } from 'lucide-react'

export function PartialDataWarning({ message = 'Some live data is delayed. Last known values are shown.' }: { message?: string }) {
  return <div role="status" className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle className="mt-0.5 shrink-0" size={17} /><span>{message}</span></div>
}
