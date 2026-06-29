import { getIO } from '../websocket/socketServer.js'
import { rooms, SOCKET_EVENTS } from '../websocket/events.js'

const notificationHistory = new Map()

export function notifyUser(userId, { title, message, type = 'queue', data = {} }) {
  if (!userId) return
  const notification = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId: String(userId),
    title,
    body: message,
    message,
    category: type,
    type,
    data,
    createdAt: new Date().toISOString(),
    read: false,
    href: '/app/notifications',
  }
  const history = notificationHistory.get(String(userId)) || []
  notificationHistory.set(String(userId), [notification, ...history].slice(0, 50))

  const io = getIO()
  if (io) io.to(rooms.user(userId)).emit(SOCKET_EVENTS.NOTIFICATION_RECEIVED, notification)
  console.info(`[notification-event] ${SOCKET_EVENTS.NOTIFICATION_RECEIVED} user=${userId} type=${type}`)
}

export function getNotificationHistory(userId) {
  return notificationHistory.get(String(userId)) || []
}
