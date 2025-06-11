import { Router } from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'
import { authMiddleware } from '../middleware/auth'
import { rateLimitMiddleware } from '../middleware/rateLimit'
import { validateAnalysisRequest } from '../middleware/validation'
import { logger } from '../utils/logger'

const router = Router()
const ANALYSIS_SERVICE_URL = process.env.ANALYSIS_SERVICE_URL || 'http://localhost:3002'

// Apply middleware
router.use(authMiddleware)
router.use(rateLimitMiddleware.general)

// Start analysis endpoint
router.post('/',
  validateAnalysisRequest,
  createProxyMiddleware({
    target: ANALYSIS_SERVICE_URL,
    pathRewrite: { '^/api/v1/analysis': '/api/v1/analysis' },
    changeOrigin: true,
    onProxyReq: (proxyReq, req) => {
      const user = (req as any).user
      proxyReq.setHeader('X-User-ID', user?.id || 'anonymous')
      proxyReq.setHeader('X-User-Role', user?.role || 'user')
      
      logger.info('Proxying analysis request', {
        userId: user?.id,
        path: req.path,
        adsCount: (req.body as any)?.ads?.length
      })
    },
    onError: (err, req, res) => {
      logger.error('Analysis service proxy error', { error: err.message })
      res.status(503).json({ error: 'Analysis service unavailable' })
    }
  })
)

// Analysis status endpoint
router.get('/:analysisId/status',
  createProxyMiddleware({
    target: ANALYSIS_SERVICE_URL,
    pathRewrite: { '^/api/v1/analysis': '/api/v1/analysis' },
    changeOrigin: true,
    onProxyReq: (proxyReq, req) => {
      const user = (req as any).user
      proxyReq.setHeader('X-User-ID', user?.id || 'anonymous')
    }
  })
)

// N8N webhook callback (no auth required)
router.post('/webhook/n8n-callback',
  createProxyMiddleware({
    target: ANALYSIS_SERVICE_URL,
    pathRewrite: { '^/api/v1/analysis': '/api/v1' },
    changeOrigin: true
  })
)

export { router as analysisRoutes } 