import { logger } from './logger'

interface MetricData {
  timestamp: number
  method: string
  path: string
  statusCode: number
  responseTime: number
  userAgent?: string
  ip?: string
  userId?: string
}

class MetricsCollector {
  private metrics: MetricData[] = []
  private maxMetrics = 1000 // Keep last 1000 metrics in memory

  recordRequest(data: MetricData): void {
    this.metrics.push(data)
    
    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics)
    }

    // Log slow requests
    if (data.responseTime > 5000) { // 5 seconds
      logger.warn('Slow request detected', {
        path: data.path,
        method: data.method,
        responseTime: data.responseTime,
        statusCode: data.statusCode
      })
    }

    // Log errors
    if (data.statusCode >= 400) {
      logger.warn('Request resulted in error', {
        path: data.path,
        method: data.method,
        statusCode: data.statusCode,
        responseTime: data.responseTime
      })
    }
  }

  getMetrics(): MetricData[] {
    return [...this.metrics]
  }

  getMetricsSummary(timeWindowMs: number = 60000): any {
    const cutoff = Date.now() - timeWindowMs
    const recentMetrics = this.metrics.filter(m => m.timestamp > cutoff)

    if (recentMetrics.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        errorRate: 0,
        timeWindow: timeWindowMs
      }
    }

    const totalRequests = recentMetrics.length
    const totalResponseTime = recentMetrics.reduce((sum, m) => sum + m.responseTime, 0)
    const averageResponseTime = totalResponseTime / totalRequests
    const errorCount = recentMetrics.filter(m => m.statusCode >= 400).length
    const errorRate = (errorCount / totalRequests) * 100

    const statusCodes = recentMetrics.reduce((acc, m) => {
      acc[m.statusCode] = (acc[m.statusCode] || 0) + 1
      return acc
    }, {} as Record<number, number>)

    const endpoints = recentMetrics.reduce((acc, m) => {
      const key = `${m.method} ${m.path}`
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      totalRequests,
      averageResponseTime: Math.round(averageResponseTime),
      errorRate: Math.round(errorRate * 100) / 100,
      timeWindow: timeWindowMs,
      statusCodes,
      topEndpoints: Object.entries(endpoints)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})
    }
  }

  clearMetrics(): void {
    this.metrics = []
    logger.info('Metrics cleared')
  }
}

export const metricsCollector = new MetricsCollector() 