import 'dotenv/config'
import app from './src/app.js'
import connectDatabase from './src/config/db.js'

const port = Number(process.env.PORT) || 5000

async function startServer() {
  try {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 64) {
      throw new Error('JWT_SECRET must contain at least 64 characters in backend/.env')
    }
    await connectDatabase()
    app.listen(port, () => {
      console.log(`NexTurn backend running at http://localhost:${port}`)
    })
  } catch (error) {
    console.error('Unable to start NexTurn backend:', error.message)
    process.exit(1)
  }
}

startServer()
