import { Router } from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'
import { authMiddleware } from '../middleware/auth'
import { rateLimitMiddleware } from '../middleware/rateLimit'
import { validateSearchRequest } from '../middleware/validation'
import { logger } from '../utils/logger'

const router = Router()
const SEARCH_SERVICE_URL = process.env.SEARCH_SERVICE_URL || 'http://localhost:3002'

// Apply middleware
router.use(authMiddleware)
router.use(rateLimitMiddleware.general)

// Search ads endpoint
router.post('/ads', 
  validateSearchRequest,
  createProxyMiddleware({
    target: SEARCH_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: {
      '^/api/v1/search': '/api/v1/search'  // This should preserve the path
    },
    onProxyReq: (proxyReq, req) => {
      const user = (req as any).user
      proxyReq.setHeader('X-User-ID', user?.id || 'anonymous')
      proxyReq.setHeader('X-User-Role', user?.role || 'user')
      
      logger.info('Proxying to search service', {
        userId: user?.id,
        targetUrl: `${SEARCH_SERVICE_URL}${req.url}`,
        originalUrl: req.originalUrl
      })
    },
    onError: (err, req, res) => {
      logger.error('Search service proxy error', { 
        error: err.message,
        targetUrl: SEARCH_SERVICE_URL 
      })
      if (res && !res.headersSent) {
        (res as any).status(503).json({ error: 'Search service unavailable' })
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
    onProxyReq: (proxyReq, req) => {
      const user = (req as any).user
      proxyReq.setHeader('X-User-ID', user?.id || 'anonymous')
    }
  })
)

export { router as searchRoutes } 