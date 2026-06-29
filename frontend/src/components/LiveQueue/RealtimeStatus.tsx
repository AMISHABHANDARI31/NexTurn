import { Wifi, WifiOff } from 'lucide-react'
import { useEffect } from 'react'
import { useQueueRealtime } from '../../hooks/useQueueRealtime'

export function RealtimeStatus() {
  const { status } = useQueueRealtime()

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
  }, [])

  const connected = status === 'connected'
  return (
    <div className={`fixed bottom-4 right-4 z-40 hidden items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold shadow-sm sm:flex ${connected ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`} aria-live="polite">
      {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
      {connected ? 'Live queue connected' : status === 'connecting' ? 'Connecting live queue…' : 'Live queue offline'}
    </div>
  )
}
