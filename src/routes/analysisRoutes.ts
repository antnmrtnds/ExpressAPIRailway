import { Router, Request, Response } from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'
import { authMiddleware } from '../middleware/auth'
import { rateLimitMiddleware } from '../middleware/rateLimit'
import { validateAnalysisRequest } from '../middleware/validation'
import { logger } from '../utils/logger'
import { ClientRequest } from 'http'
import axios from 'axios'

const router = Router()
const ANALYSIS_SERVICE_URL = process.env.ANALYSIS_SERVICE_URL || 'http://localhost:3002'

// N8N webhook callback (no auth required - MUST BE FIRST)
router.post('/webhook/n8n-callback', async (req: Request, res: Response) => {
  try {
    logger.info('N8N webhook callback received', {
      method: req.method,
      path: req.path,
      body: req.body,
      headers: {
        'content-type': req.headers['content-type'],
        'user-agent': req.headers['user-agent']
      }
    })

    // Forward to analysis service
    const response = await axios.post(
      `${ANALYSIS_SERVICE_URL}/api/v1/webhook/n8n-callback`,
      req.body,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    )

    logger.info('N8N callback forwarded successfully', {
      status: response.status,
      analysisId: req.body?.analysisId
    })

    res.status(response.status).json(response.data)
  } catch (error: any) {
    logger.error('N8N callback forward failed', {
      error: error.message,
      status: error.response?.status,
      data: error.response?.data,
      analysisId: req.body?.analysisId
    })

    if (error.response) {
      res.status(error.response.status).json(error.response.data)
    } else {
      res.status(500).json({ error: 'Failed to forward callback' })
    }
  }
})

// Apply middleware to authenticated routes only
router.use(authMiddleware)
router.use(rateLimitMiddleware.general)

// Start analysis endpoint
router.post('/',
  validateAnalysisRequest,
  createProxyMiddleware({
    target: ANALYSIS_SERVICE_URL,
    pathRewrite: { '^/api/v1/analysis': '/api/v1/analysis' },
    changeOrigin: true,
    onProxyReq: (proxyReq: ClientRequest, req: Request) => {
      const user = (req as any).user
      proxyReq.setHeader('X-User-ID', user?.id || 'anonymous')
      proxyReq.setHeader('X-User-Role', user?.role || 'user')
      
      logger.info('Proxying analysis request', {
        userId: user?.id,
        path: req.path,
        adsCount: (req.body as any)?.ads?.length
      })
    },
    onError: (err: Error, req: Request, res: Response) => {
      logger.error('Analysis service proxy error', { error: err.message })
      if (res && !res.headersSent) {
        res.status(503).json({ error: 'Analysis service unavailable' })
      }
    }
  })
)

// Analysis status endpoint
router.get('/:analysisId/status',
  createProxyMiddleware({
    target: ANALYSIS_SERVICE_URL,
    pathRewrite: { '^/api/v1/analysis': '/api/v1/analysis' },
    changeOrigin: true,
    onProxyReq: (proxyReq: ClientRequest, req: Request) => {
      const user = (req as any).user
      proxyReq.setHeader('X-User-ID', user?.id || 'anonymous')
    }
  })
)

export { router as analysisRoutes } 