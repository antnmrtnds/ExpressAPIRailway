import { Request, Response, NextFunction } from 'express'
import { rateLimitManager } from '../utils/rateLimitManager'
import { logger } from '../utils/logger'

function generalRateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip rate limiting for health checks
  if (req.path === '/health') {
    return next()
  }

  const identifier = req.ip || 'unknown'
  
  rateLimitManager.checkApiRateLimit(identifier)
    .then(result => {
      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': '60',
        'X-RateLimit-Remaining': result.remainingRequests.toString(),
        'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
      })

      if (!result.allowed) {
        logger.warn('Rate limit exceeded', { 
          ip: identifier, 
          path: req.path,
          method: req.method 
        })
        
        return res.status(429).json({
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          resetTime: new Date(result.resetTime).toISOString()
        })
      }

      next()
    })
    .catch(error => {
      logger.error('Rate limit check failed', { error: error.message })
      // On error, allow the request to proceed
      next()
    })
}

// Specific middleware for auth endpoints
export function authRateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const identifier = req.ip || 'unknown'
  
  rateLimitManager.checkAuthRateLimit(identifier)
    .then(result => {
      res.set({
        'X-RateLimit-Limit': '5',
        'X-RateLimit-Remaining': result.remainingRequests.toString(),
        'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
      })

      if (!result.allowed) {
        logger.warn('Rate limit reached for auth endpoint', {
          ip: identifier,
          path: req.path,
          method: req.method
        })
        
        return res.status(429).json({
          error: 'Too many authentication attempts',
          message: 'Please wait before trying again.',
          resetTime: new Date(result.resetTime).toISOString()
        })
      }

      next()
    })
    .catch(error => {
      logger.error('Auth rate limit check failed', { error: error.message })
      next()
    })
}

export const rateLimitMiddleware = {
  general: generalRateLimitMiddleware,
  auth: authRateLimitMiddleware
} 