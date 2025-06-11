import { Router } from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'
import { authMiddleware } from '../middleware/auth'
import { rateLimitMiddleware } from '../middleware/rateLimit'
import { validateSearchRequest } from '../middleware/validation'
import { logger } from '../utils/logger'
import { Request, Response } from 'express'
import { ClientRequest } from 'http'

const router = Router()
const SEARCH_SERVICE_URL = process.env.SEARCH_SERVICE_URL || 'http://localhost:3001'

// Apply middleware
router.use(authMiddleware)
router.use(rateLimitMiddleware.general)

// Search ads endpoint
router.post('/ads', 
  validateSearchRequest,
  createProxyMiddleware({
    target: SEARCH_SERVICE_URL,
    pathRewrite: { '^/api/v1/search': '/api/v1/search' },
    changeOrigin: true,
    onProxyReq: (proxyReq: ClientRequest, req: Request) => {
      // Add user context to request
      const user = (req as any).user
      proxyReq.setHeader('X-User-ID', user?.id || 'anonymous')
      proxyReq.setHeader('X-User-Role', user?.role || 'user')
      
      logger.info('Proxying search request', {
        userId: user?.id,
        path: req.path,
        company: (req.body as any)?.company
      })
    },
    onError: (err: Error, req: Request, res: Response) => {
      logger.error('Search service proxy error', { error: err.message })
      if (res && !res.headersSent) {
        res.status(503).json({ error: 'Search service unavailable' })
      }
    }
  })
)

// Search status endpoint
router.get('/:searchId/status',
  createProxyMiddleware({
    target: SEARCH_SERVICE_URL,
    pathRewrite: { '^/api/v1/search': '/api/v1/search' },
    changeOrigin: true,
    onProxyReq: (proxyReq: ClientRequest, req: Request) => {
      const user = (req as any).user
      proxyReq.setHeader('X-User-ID', user?.id || 'anonymous')
    }
  })
)

export { router as searchRoutes } 