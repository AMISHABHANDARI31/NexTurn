import { io, type Socket } from 'socket.io-client'
import { auth } from '../lib/auth/auth'

export const SOCKET_EVENTS = {
  CONNECTED: 'CONNECTED',
  SUBSCRIBE_QUEUE: 'SUBSCRIBE_QUEUE',
  SUBSCRIPTION_CONFIRMED: 'SUBSCRIPTION_CONFIRMED',
  SUBSCRIPTION_DENIED: 'SUBSCRIPTION_DENIED',
  QUEUE_UPDATED: 'QUEUE_UPDATED',
  TOKEN_CANCELLED: 'TOKEN_CANCELLED',
  NEXT_USER_CALLED: 'NEXT_USER_CALLED',
  QUEUE_AUTO_ADVANCED: 'QUEUE_AUTO_ADVANCED',
  NEXT_USER_AUTOMATICALLY_CALLED: 'NEXT_USER_AUTOMATICALLY_CALLED',
  COUNTER_STATUS_CHANGED: 'COUNTER_STATUS_CHANGED',
  PREDICTION_UPDATED: 'PREDICTION_UPDATED',
  NOTIFICATION_RECEIVED: 'NOTIFICATION_RECEIVED',
} as const

let socket: Socket | null = null
const productionApiBaseUrl = 'https://nexturn-8vta.onrender.com/api/v1/sqps'
const localApiBaseUrl = 'http://localhost:5000/api/v1/sqps'

function getSocketUrl() {
  const apiBase = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? productionApiBaseUrl : localApiBaseUrl)
  return apiBase.replace(/\/api\/v1\/sqps\/?$/, '')
}

export function getRealtimeSocket() {
  const token = auth.getToken()
  if (!token) return null

  if (!socket) {
    socket = io(getSocketUrl(), {
      auth: { token },
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 8_000,
      transports: ['websocket', 'polling'],
    })
  } else {
    socket.auth = { token }
  }

  return socket
}

export function disconnectRealtimeSocket() {
  socket?.disconnect()
  socket = null
}
