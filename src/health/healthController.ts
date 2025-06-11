import { Request, Response } from 'express'
import { checkServiceHealth } from '../utils/serviceHealth'
import { redisClient } from '../config/redis'
import { supabase } from '../config/supabase'
import { rateLimitManager } from '../utils/rateLimitManager'
import { metricsCollector } from '../utils/metrics'
import { logger } from '../utils/logger'

export const healthController = {
  basic(req: Request, res: Response) {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    })
  },

  async detailed(req: Request, res: Response) {
    try {
      const services = await Promise.allSettled([
        checkServiceHealth('search', process.env.SEARCH_SERVICE_URL || 'http://localhost:3001'),
        checkServiceHealth('analysis', process.env.ANALYSIS_SERVICE_URL || 'http://localhost:3002'),
        checkServiceHealth('results', process.env.RESULTS_SERVICE_URL || 'http://localhost:3003'),
        checkRedisHealth()
      ])

      const [search, analysis, results, redis] = services

      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: {
          search: search.status === 'fulfilled' ? search.value : { status: 'unhealthy', error: (search as any).reason?.message },
          analysis: analysis.status === 'fulfilled' ? analysis.value : { status: 'unhealthy', error: (analysis as any).reason?.message },
          results: results.status === 'fulfilled' ? results.value : { status: 'unhealthy', error: (results as any).reason?.message },
          redis: redis.status === 'fulfilled' ? redis.value : { status: 'unhealthy', error: (redis as any).reason?.message }
        }
      }

      // Determine overall status
      const allHealthy = Object.values(health.services).every(service => service.status === 'healthy')
      health.status = allHealthy ? 'healthy' : 'degraded'

      res.status(allHealthy ? 200 : 503).json(health)
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      })
    }
  },

  async readiness(req: Request, res: Response) {
    // Check if all dependencies are ready
    try {
      await checkRedisHealth()
      res.json({ status: 'ready' })
    } catch (error) {
      res.status(503).json({ status: 'not ready', error: error instanceof Error ? error.message : 'Unknown error' })
    }
  },

  liveness(req: Request, res: Response) {
    // Simple liveness check
    res.json({ status: 'alive' })
  },

  async getHealth(req: Request, res: Response) {
    const checks: Array<{ status: string; service: string; error?: string; details?: string }> = []
    const startTime = Date.now()

    try {
      // Check Supabase
      const supabaseHealth = await checkSupabaseHealth()
      checks.push(supabaseHealth)
    } catch (error) {
      checks.push({ status: 'unhealthy', service: 'supabase', error: error instanceof Error ? error.message : 'Unknown error' })
    }

    try {
      // Check Rate Limiter
      const rateLimitHealth = await checkRateLimitHealth()
      checks.push(rateLimitHealth)
    } catch (error) {
      checks.push({ status: 'unhealthy', service: 'rate-limiter', error: error instanceof Error ? error.message : 'Unknown error' })
    }

    // Get metrics summary
    const metrics = metricsCollector.getMetricsSummary()

    const allHealthy = checks.every(check => check.status === 'healthy')
    const responseTime = Date.now() - startTime

    const healthStatus = {
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      responseTime,
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      services: checks,
      metrics
    }

    const statusCode = allHealthy ? 200 : 503
    res.status(statusCode).json(healthStatus)

    if (!allHealthy) {
      logger.warn('Health check failed', { healthStatus })
    }
  },

  async getMetrics(req: Request, res: Response) {
    try {
      const timeWindow = parseInt(req.query.window as string) || 60000
      const metrics = metricsCollector.getMetricsSummary(timeWindow)
      
      res.json({
        success: true,
        data: metrics
      })
    } catch (error) {
      logger.error('Failed to get metrics', { error: error instanceof Error ? error.message : 'Unknown error' })
      res.status(500).json({
        error: 'Failed to retrieve metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
}

async function checkRedisHealth() {
  try {
    await redisClient.ping()
    return { status: 'healthy', service: 'redis' }
  } catch (error) {
    throw new Error(`Redis health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

async function checkSupabaseHealth() {
  try {
    const { error } = await supabase
      .from('users')
      .select('count')
      .limit(1)
    
    if (error) throw error
    return { status: 'healthy', service: 'supabase' }
  } catch (error) {
    throw new Error(`Supabase health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

async function checkRateLimitHealth() {
  try {
    const result = await rateLimitManager.getRateLimitStatus('health-check')
    return { 
      status: 'healthy', 
      service: 'rate-limiter',
      details: result ? 'Connected to Redis' : 'Redis connection issue'
    }
  } catch (error) {
    throw new Error(`Rate limiter health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
} 