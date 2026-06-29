import type { QueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

interface QueueUpdatedPayload {
  queueId: string
  currentToken: { code: string; status: string } | null
  userToken?: { id: string; code: string; status: string } | null
  peopleAhead?: number
  waitingCount: number
  estimatedWaitTime: number
  queueProgress?: number
}

interface NotificationPayload {
  title: string
  message: string
  type?: string
}

export function handleQueueUpdated(queryClient: QueryClient, payload: QueueUpdatedPayload) {
  queryClient.setQueryData(['realtime-queue', payload.queueId], payload)
  queryClient.invalidateQueries({ queryKey: ['manager-queue'] })
  queryClient.invalidateQueries({ queryKey: ['manager-counters'] })
  queryClient.invalidateQueries({ queryKey: ['tokens'] })
  queryClient.invalidateQueries({ queryKey: ['prediction-core'] })
}

export function handleCounterStatusChanged(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['service-locations'] })
  queryClient.invalidateQueries({ queryKey: ['manager-counters'] })
  queryClient.invalidateQueries({ queryKey: ['manager-automation'] })
  queryClient.invalidateQueries({ queryKey: ['prediction-core'] })
}

export function handlePredictionUpdated(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['prediction-core'] })
}

export function handleNotificationReceived(queryClient: QueryClient, payload: NotificationPayload) {
  queryClient.invalidateQueries({ queryKey: ['notifications'] })
  toast(payload.message, { icon: payload.type === 'queue' ? '🎫' : '🔔' })

  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(payload.title, { body: payload.message })
  }
}
