import { Express } from 'express'
import { rateLimitMiddleware } from './rateLimit'
import { requestLogger } from './requestLogger'
import { securityHeaders } from './security'

export function setupMiddleware(app: Express) {
  // Request logging
  app.use(requestLogger)
  
  // Security headers
  app.use(securityHeaders)
  
  // General rate limiting (applied to all routes)
  app.use(rateLimitMiddleware.general)
} 