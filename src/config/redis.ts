import Redis from 'ioredis'
import { logger } from '../utils/logger'

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

export const redisClient = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  enableReadyCheck: true,
  enableOfflineQueue: true,
  connectTimeout: 10000,
  commandTimeout: 5000
})

redisClient.on('connect', () => {
  logger.info('API Gateway connected to Redis')
})

redisClient.on('error', (error) => {
  logger.error('API Gateway Redis connection error', { error: error.message })
})

redisClient.on('ready', () => {
  logger.info('API Gateway Redis connection ready')
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  await redisClient.quit()
})

process.on('SIGINT', async () => {
  await redisClient.quit()
}) 