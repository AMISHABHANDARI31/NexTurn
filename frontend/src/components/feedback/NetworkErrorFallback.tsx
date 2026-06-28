import { CloudOff, RefreshCw } from 'lucide-react'
import { Button } from '../ui/Button'

export function NetworkErrorFallback({ onRetry }: { onRetry?: () => void }) {
  return <div role="alert" className="card border-red-200 p-6 text-center"><CloudOff className="mx-auto mb-3 text-red-600" /><h3 className="font-bold">Connection interrupted</h3><p className="mt-1 text-sm text-slate-600">We kept your place. Reconnect and try again.</p>{onRetry && <Button className="mt-4" variant="secondary" icon={<RefreshCw size={16} />} onClick={onRetry}>Try again</Button>}</div>
}
