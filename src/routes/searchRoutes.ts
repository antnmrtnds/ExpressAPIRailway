import { Router } from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'
import { authMiddleware } from '../middleware/auth'
import { rateLimitMiddleware } from '../middleware/rateLimit'
import { validateSearchRequest } from '../middleware/validation'
import { logger } from '../utils/logger'
import axios from 'axios'

const router = Router()
const SEARCH_SERVICE_URL = process.env.SEARCH_SERVICE_URL || 'http://localhost:3002'

// Apply middleware
router.use(authMiddleware)
router.use(rateLimitMiddleware.general)

// Search ads endpoint
router.post('/ads', 
  validateSearchRequest,
  async (req, res, next) => {
    try {
      const user = (req as any).user
      
      logger.info('Forwarding search request', {
        userId: user?.id,
        body: req.body,
        targetUrl: `${SEARCH_SERVICE_URL}/api/v1/search/ads`
      })
      
      const response = await axios.post(
        `${SEARCH_SERVICE_URL}/api/v1/search/ads`,
        req.body,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-User-ID': user?.id || 'anonymous',
            'X-User-Role': user?.role || 'user'
          },
          timeout: 60000
        }
      )
      
      res.status(response.status).json(response.data)
    } catch (error: any) {
      logger.error('Search service request failed', {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      })
      
      if (error.response) {
        res.status(error.response.status).json(error.response.data)
      } else {
        res.status(503).json({ error: 'Search service unavailable' })
      }
    }
  }
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