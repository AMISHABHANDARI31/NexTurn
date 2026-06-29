import 'dotenv/config'
import http from 'node:http'
import app from './src/app.js'
import connectDatabase from './src/config/db.js'
import { initSocketServer } from './src/websocket/socketServer.js'
import { startQueueAutomationScheduler } from './src/modules/queue/scheduler.js'
import { validateEmailConfig } from './src/services/emailService.js'
import { startEmailQueueWorker } from './src/services/emailQueue.js'
import { validateEnvironment } from './src/config/env.js'
import { logger } from './src/logging/logger.js'

const port = Number(process.env.PORT) || 5000
let server

async function startServer() {
  try {
    validateEnvironment()
    validateEmailConfig()
    await connectDatabase()
    server = http.createServer(app)
    initSocketServer(server)
    startQueueAutomationScheduler()
    startEmailQueueWorker()
    server.listen(port, () => {
      logger.info({ event: 'SERVER_STARTED', port, environment: process.env.NODE_ENV || 'development' })
    })
  } catch (error) {
    logger.error({ event: 'SERVER_START_FAILED', message: error.message })
    process.exit(1)
  }
}

startServer()

async function shutdown(signal) {
  logger.info({ event: 'GRACEFUL_SHUTDOWN_STARTED', signal })
  if (server) {
    server.close(() => {
      logger.info({ event: 'HTTP_SERVER_CLOSED' })
      process.exit(0)
    })
    setTimeout(() => process.exit(1), 10_000).unref()
  } else {
    process.exit(0)
  }
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
