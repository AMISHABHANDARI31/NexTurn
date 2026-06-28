import 'dotenv/config'
import dns from 'node:dns'
import mongoose from 'mongoose'

export default async function connectDatabase() {
  const mongoUri = process.env.MONGO_URI
  if (!mongoUri) throw new Error('MONGO_URI is missing from backend/.env')

  try {
    await mongoose.connect(mongoUri, { dbName: process.env.MONGO_DB_NAME || 'nexturn' })
  } catch (error) {
    const isDnsRefusal = error.code === 'ECONNREFUSED' && error.message.includes('querySrv')
    if (!isDnsRefusal) throw error
    dns.setServers(['8.8.8.8', '1.1.1.1'])
    await mongoose.connect(mongoUri, { dbName: process.env.MONGO_DB_NAME || 'nexturn' })
  }

  console.log(`MongoDB connected: ${mongoose.connection.name}`)
}
