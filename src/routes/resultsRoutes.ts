import { Router } from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'
import { authMiddleware } from '../middleware/auth'
import { rateLimitMiddleware } from '../middleware/rateLimit'
import { logger } from '../utils/logger'
import { Request, Response } from 'express'
import { ClientRequest } from 'http'

const router = Router()
const RESULTS_SERVICE_URL = process.env.RESULTS_SERVICE_URL || 'http://localhost:3003'

// Apply middleware
router.use(authMiddleware)
router.use(rateLimitMiddleware.general)

// Get results endpoint
router.get('/',
  createProxyMiddleware({
    target: RESULTS_SERVICE_URL,
    pathRewrite: { '^/api/v1/results': '/api/v1/results' },
    changeOrigin: true,
    onProxyReq: (proxyReq: ClientRequest, req: Request) => {
      const user = (req as any).user
      proxyReq.setHeader('X-User-ID', user?.id || 'anonymous')
      proxyReq.setHeader('X-User-Role', user?.role || 'user')
      
      // Add user-specific filtering for non-admin users
      if (user?.role !== 'admin') {
        // In production, you might want to filter results by user ownership
        // proxyReq.setHeader('X-Filter-User', user.id)
      }
    },
    onError: (err: Error, req: Request, res: Response) => {
      logger.error('Results service proxy error', { error: err.message })
      if (res && !res.headersSent) {
        res.status(503).json({ error: 'Results service unavailable' })
      }
    }
  })
)

// Get results by analysis ID
router.get('/:analysisId',
  createProxyMiddleware({
    target: RESULTS_SERVICE_URL,
    pathRewrite: { '^/api/v1/results': '/api/v1/results' },
    changeOrigin: true,
    onProxyReq: (proxyReq: ClientRequest, req: Request) => {
      const user = (req as any).user
      proxyReq.setHeader('X-User-ID', user?.id || 'anonymous')
    },
    onError: (err: Error, req: Request, res: Response) => {
      logger.error('Results service proxy error', { error: err.message })
      if (res && !res.headersSent) {
        res.status(503).json({ error: 'Results service unavailable' })
      }
    }
  })
)

// Save results endpoint (typically called by internal services)
router.post('/',
  createProxyMiddleware({
    target: RESULTS_SERVICE_URL,
    pathRewrite: { '^/api/v1/results': '/api/v1/results' },
    changeOrigin: true,
    onProxyReq: (proxyReq: ClientRequest, req: Request) => {
      const user = (req as any).user
      proxyReq.setHeader('X-User-ID', user?.id || 'anonymous')
      
      logger.info('Proxying save results request', {
        userId: user?.id,
        resultsCount: Array.isArray(req.body) ? req.body.length : 1
      })
    },
    onError: (err: Error, req: Request, res: Response) => {
      logger.error('Results service proxy error', { error: err.message })
      if (res && !res.headersSent) {
        res.status(503).json({ error: 'Results service unavailable' })
      }
    }
  })
)

// Delete result endpoint
router.delete('/:resultId',
  createProxyMiddleware({
    target: RESULTS_SERVICE_URL,
    pathRewrite: { '^/api/v1/results': '/api/v1/results' },
    changeOrigin: true,
    onProxyReq: (proxyReq: ClientRequest, req: Request) => {
      const user = (req as any).user
      proxyReq.setHeader('X-User-ID', user?.id || 'anonymous')
    },
    onError: (err: Error, req: Request, res: Response) => {
      logger.error('Results service proxy error', { error: err.message })
      if (res && !res.headersSent) {
        res.status(503).json({ error: 'Results service unavailable' })
      }
    }
  })
)

// Stats endpoint
router.get('/stats/summary',
  createProxyMiddleware({
    target: RESULTS_SERVICE_URL,
    pathRewrite: { '^/api/v1/results': '/api/v1' },
    changeOrigin: true,
    onProxyReq: (proxyReq: ClientRequest, req: Request) => {
      const user = (req as any).user
      proxyReq.setHeader('X-User-ID', user?.id || 'anonymous')
    },
    onError: (err: Error, req: Request, res: Response) => {
      logger.error('Results service proxy error', { error: err.message })
      if (res && !res.headersSent) {
        res.status(503).json({ error: 'Results service unavailable' })
      }
    }
  })
)

export { router as resultsRoutes } 