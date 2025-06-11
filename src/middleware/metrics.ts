import { Request, Response, NextFunction } from 'express'
import { metricsCollector } from '../utils/metrics'

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now()

  // Override res.end to capture metrics
  const originalEnd = res.end
  res.end = function (this: Response, chunk?: any, encoding?: any, cb?: any) {
    const endTime = Date.now()
    const responseTime = endTime - startTime

    // Record the metric
    metricsCollector.recordRequest({
      timestamp: endTime,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      userId: (req as any).user?.id
    })

    // Call the original end method
    originalEnd.call(this, chunk, encoding, cb)
  } as any

  next()
} 