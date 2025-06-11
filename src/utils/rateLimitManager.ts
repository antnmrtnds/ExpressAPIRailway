import Redis from 'ioredis'
import { logger } from './logger'

interface RateLimitOptions {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  keyPrefix?: string // Redis key prefix
}

interface RateLimitResult {
  allowed: boolean
  remainingRequests: number
  resetTime: number
  totalRequests: number
}

class RateLimitManager {
  private redis: Redis
  private defaultOptions: RateLimitOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    keyPrefix: 'rate_limit'
  }

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true
    })

    this.redis.on('error', (error) => {
      logger.error('Rate limit manager Redis error', { error: error.message })
    })

    this.redis.on('connect', () => {
      logger.info('Rate limit manager connected to Redis')
    })
  }

  async checkRateLimit(
    identifier: string, 
    options: Partial<RateLimitOptions> = {}
  ): Promise<RateLimitResult> {
    const config = { ...this.defaultOptions, ...options }
    const key = `${config.keyPrefix}:${identifier}`
    const now = Date.now()
    const windowStart = now - config.windowMs

    try {
      // Remove old entries outside the current window
      await this.redis.zremrangebyscore(key, 0, windowStart)
      
      // Get current request count
      const currentRequests = await this.redis.zcard(key)
      
      const allowed = currentRequests < config.maxRequests
      
      if (allowed) {
        // Add current request to the set
        await this.redis.zadd(key, now, `${now}-${Math.random()}`)
        // Set expiration for the key
        await this.redis.expire(key, Math.ceil(config.windowMs / 1000))
      }
      
      const remainingRequests = Math.max(0, config.maxRequests - currentRequests - (allowed ? 1 : 0))
      const resetTime = now + config.windowMs
      
      return {
        allowed,
        remainingRequests,
        resetTime,
        totalRequests: currentRequests + (allowed ? 1 : 0)
      }
    } catch (error) {
      logger.error('Rate limit check failed', { 
        identifier, 
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      
      // On Redis error, allow the request to avoid blocking users
      return {
        allowed: true,
        remainingRequests: config.maxRequests,
        resetTime: now + config.windowMs,
        totalRequests: 0
      }
    }
  }

  async resetRateLimit(identifier: string, keyPrefix?: string): Promise<void> {
    const prefix = keyPrefix || this.defaultOptions.keyPrefix
    const key = `${prefix}:${identifier}`
    
    try {
      await this.redis.del(key)
      logger.info('Rate limit reset', { identifier })
    } catch (error) {
      logger.error('Failed to reset rate limit', { 
        identifier, 
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  async getRateLimitStatus(identifier: string, keyPrefix?: string): Promise<RateLimitResult | null> {
    const prefix = keyPrefix || this.defaultOptions.keyPrefix
    const key = `${prefix}:${identifier}`
    const now = Date.now()
    const windowStart = now - this.defaultOptions.windowMs

    try {
      await this.redis.zremrangebyscore(key, 0, windowStart)
      const currentRequests = await this.redis.zcard(key)
      
      return {
        allowed: currentRequests < this.defaultOptions.maxRequests,
        remainingRequests: Math.max(0, this.defaultOptions.maxRequests - currentRequests),
        resetTime: now + this.defaultOptions.windowMs,
        totalRequests: currentRequests
      }
    } catch (error) {
      logger.error('Failed to get rate limit status', { 
        identifier, 
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return null
    }
  }

  // Specific rate limits for different endpoints
  async checkAuthRateLimit(identifier: string): Promise<RateLimitResult> {
    return this.checkRateLimit(identifier, {
      windowMs: 1 * 60 * 1000, // 15 minutes
      maxRequests: 20, // 20 login attempts per 15 minutes
      keyPrefix: 'auth_rate_limit'
    })
  }

  async checkApiRateLimit(identifier: string): Promise<RateLimitResult> {
    return this.checkRateLimit(identifier, {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 60, // 60 requests per minute
      keyPrefix: 'api_rate_limit'
    })
  }

  async checkSearchRateLimit(identifier: string): Promise<RateLimitResult> {
    return this.checkRateLimit(identifier, {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 100, // 100 searches per hour
      keyPrefix: 'search_rate_limit'
    })
  }

  async close(): Promise<void> {
    await this.redis.quit()
  }
}

export const rateLimitManager = new RateLimitManager()

// Graceful shutdown
process.on('SIGTERM', async () => {
  await rateLimitManager.close()
})

process.on('SIGINT', async () => {
  await rateLimitManager.close()
}) 