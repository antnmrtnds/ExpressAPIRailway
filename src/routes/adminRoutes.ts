import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import { rateLimitMiddleware } from '../middleware/rateLimit'

const router = Router()

// Apply auth and rate limiting
router.use(authMiddleware)
router.use(rateLimitMiddleware.general)

// Admin middleware to check role
router.use((req, res, next) => {
  const user = (req as any).user
  if (user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
})

// Admin endpoints
router.get('/users', (req, res) => {
  res.json({ message: 'Get users - admin endpoint' })
})

router.get('/metrics', (req, res) => {
  res.json({ message: 'Get system metrics - admin endpoint' })
})

export { router as adminRoutes } 