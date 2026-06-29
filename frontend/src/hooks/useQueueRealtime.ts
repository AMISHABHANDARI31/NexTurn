import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { auth } from '../lib/auth/auth'
import { useAuth } from '../lib/auth/AuthContext'
import {
  handleCounterStatusChanged,
  handleNotificationReceived,
  handlePredictionUpdated,
  handleQueueUpdated,
} from '../websocket/eventHandlers'
import { getRealtimeSocket, SOCKET_EVENTS } from '../websocket/socket'

interface ActiveToken {
  tokenId?: string
  locationId?: string
}

const ACTIVE_TOKEN_KEY = 'nexturn.active-token'

function readActiveToken(): ActiveToken | null {
  try {
    return JSON.parse(localStorage.getItem(ACTIVE_TOKEN_KEY) ?? 'null')
  } catch {
    return null
  }
}

export function useQueueRealtime() {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<'offline' | 'connecting' | 'connected' | 'error'>('offline')
  const activeToken = useMemo(readActiveToken, [session?.id])

  useEffect(() => {
    if (!session || !auth.getToken()) {
      setStatus('offline')
      return
    }

    const socket = getRealtimeSocket()
    if (!socket) return

    const subscribeActiveToken = () => {
      const token = readActiveToken()
      if (token?.locationId) {
        socket.emit(SOCKET_EVENTS.SUBSCRIBE_QUEUE, {
          locationId: token.locationId,
          tokenId: token.tokenId,
        })
      }
    }

    setStatus(socket.connected ? 'connected' : 'connecting')

    socket.on('connect', () => {
      setStatus('connected')
      subscribeActiveToken()
    })
    socket.on('disconnect', () => setStatus('offline'))
    socket.on('connect_error', () => setStatus('error'))
    socket.on(SOCKET_EVENTS.QUEUE_UPDATED, (payload) => handleQueueUpdated(queryClient, payload))
    socket.on(SOCKET_EVENTS.TOKEN_CANCELLED, (payload) => {
      queryClient.invalidateQueries({ queryKey: ['manager-queue'] })
      queryClient.invalidateQueries({ queryKey: ['tokens'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['prediction-core'] })
      if (payload?.userId === session.id) {
        localStorage.removeItem('nexturn.active-token')
        window.dispatchEvent(new Event('nexturn-active-token-changed'))
        handleNotificationReceived(queryClient, { title: 'Token cancelled', message: `Your token ${payload.tokenNumber} has been cancelled.`, type: 'queue' })
      }
    })
    socket.on(SOCKET_EVENTS.NEXT_USER_CALLED, (payload) => {
      queryClient.invalidateQueries({ queryKey: ['manager-queue'] })
      queryClient.invalidateQueries({ queryKey: ['manager-automation'] })
      queryClient.invalidateQueries({ queryKey: ['prediction-core'] })
      if (payload?.userId === session.id) {
        handleNotificationReceived(queryClient, { title: 'Your turn is approaching', message: payload.message || 'Please be ready.', type: 'queue' })
      }
    })
    socket.on(SOCKET_EVENTS.QUEUE_AUTO_ADVANCED, (payload) => {
      queryClient.invalidateQueries({ queryKey: ['manager-queue'] })
      queryClient.invalidateQueries({ queryKey: ['manager-automation'] })
      queryClient.invalidateQueries({ queryKey: ['prediction-core'] })
      if (payload?.queueId) handleQueueUpdated(queryClient, { queueId: payload.queueId, currentToken: payload.currentToken, waitingCount: 0, estimatedWaitTime: payload.estimatedWaitTime ?? 0 })
    })
    socket.on(SOCKET_EVENTS.NEXT_USER_AUTOMATICALLY_CALLED, (payload) => {
      queryClient.invalidateQueries({ queryKey: ['manager-queue'] })
      queryClient.invalidateQueries({ queryKey: ['manager-automation'] })
      if (payload?.userId === session.id) {
        handleNotificationReceived(queryClient, { title: 'Your turn has started', message: payload.message || 'Please proceed to the counter.', type: 'queue' })
      }
    })
    socket.on(SOCKET_EVENTS.COUNTER_STATUS_CHANGED, () => handleCounterStatusChanged(queryClient))
    socket.on(SOCKET_EVENTS.PREDICTION_UPDATED, () => handlePredictionUpdated(queryClient))
    socket.on(SOCKET_EVENTS.NOTIFICATION_RECEIVED, (payload) => handleNotificationReceived(queryClient, payload))

    socket.connect()
    subscribeActiveToken()

    const onFocus = () => subscribeActiveToken()
    const onActiveTokenChanged = () => subscribeActiveToken()
    window.addEventListener('focus', onFocus)
    window.addEventListener('nexturn-active-token-changed', onActiveTokenChanged)

    return () => {
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('nexturn-active-token-changed', onActiveTokenChanged)
      socket.off('connect')
      socket.off('disconnect')
      socket.off('connect_error')
      socket.off(SOCKET_EVENTS.QUEUE_UPDATED)
      socket.off(SOCKET_EVENTS.TOKEN_CANCELLED)
      socket.off(SOCKET_EVENTS.NEXT_USER_CALLED)
      socket.off(SOCKET_EVENTS.QUEUE_AUTO_ADVANCED)
      socket.off(SOCKET_EVENTS.NEXT_USER_AUTOMATICALLY_CALLED)
      socket.off(SOCKET_EVENTS.COUNTER_STATUS_CHANGED)
      socket.off(SOCKET_EVENTS.PREDICTION_UPDATED)
      socket.off(SOCKET_EVENTS.NOTIFICATION_RECEIVED)
    }
  }, [queryClient, session, activeToken?.locationId, activeToken?.tokenId])

  return { status }
}
