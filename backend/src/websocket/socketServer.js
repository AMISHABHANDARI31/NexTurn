import { Server } from 'socket.io'
import Token from '../models/tokenModel.js'
import Location from '../models/locationModel.js'
import { authenticateSocket } from './authentication.js'
import { rooms, SOCKET_EVENTS } from './events.js'

let io

export function initSocketServer(httpServer) {
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ].filter(Boolean)

  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  })

  io.use(authenticateSocket)
  io.on('connection', async (socket) => {
    socket.join(rooms.user(socket.user._id))

    if (socket.user.role === 'Manager' && socket.user.assignedLocationId) {
      socket.join(rooms.managerBranch(socket.user.assignedLocationId))
      const assignedLocation = await Location.findById(socket.user.assignedLocationId).lean()
      if (assignedLocation) {
        const branchLocationIds = await Location.find({ location: assignedLocation.location }).distinct('_id')
        branchLocationIds.forEach((locationId) => socket.join(rooms.location(locationId)))
      }
    }

    socket.emit(SOCKET_EVENTS.CONNECTED, {
      userId: String(socket.user._id),
      role: socket.user.role,
      timestamp: new Date().toISOString(),
    })

    socket.on(SOCKET_EVENTS.SUBSCRIBE_QUEUE, async ({ locationId, tokenId } = {}) => {
      try {
        if (!locationId) return socket.emit(SOCKET_EVENTS.SUBSCRIPTION_DENIED, { message: 'locationId is required.' })
        const allowed = await canSubscribeToLocation(socket.user, locationId, tokenId)
        if (!allowed) return socket.emit(SOCKET_EVENTS.SUBSCRIPTION_DENIED, { locationId, message: 'You are not authorized for this queue.' })
        socket.join(rooms.location(locationId))
        socket.emit(SOCKET_EVENTS.SUBSCRIPTION_CONFIRMED, { locationId, tokenId, timestamp: new Date().toISOString() })
      } catch {
        socket.emit(SOCKET_EVENTS.SUBSCRIPTION_DENIED, { locationId, message: 'Unable to subscribe to this queue.' })
      }
    })
  })

  return io
}

export function getIO() {
  return io
}

async function canSubscribeToLocation(user, locationId, tokenId) {
  if (user.role === 'SystemAdmin') return true
  if (user.role === 'Manager') {
    if (String(user.assignedLocationId) === String(locationId)) return true
    const [assignedLocation, targetLocation] = await Promise.all([
      Location.findById(user.assignedLocationId).lean(),
      Location.findById(locationId).lean(),
    ])
    return Boolean(assignedLocation && targetLocation && assignedLocation.location === targetLocation.location)
  }

  const filter = { user: user._id, location: locationId, status: { $in: ['waiting', 'serving'] } }
  if (tokenId) filter._id = tokenId
  return Boolean(await Token.exists(filter))
}
