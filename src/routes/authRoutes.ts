import { Router } from 'express'
import { AuthController } from '../controllers/authController'
import { authRateLimitMiddleware } from '../middleware/rateLimit'

const router = Router()
const authController = new AuthController()

// Apply strict rate limiting for auth endpoints
router.use(authRateLimitMiddleware)

// Authentication endpoints
router.post('/login', authController.login)
router.post('/register', authController.register)
router.post('/refresh', authController.refresh)
router.post('/logout', authController.logout)
router.post('/forgot-password', authController.forgotPassword)
router.post('/reset-password', authController.resetPassword)

// Verification endpoints
router.post('/verify-email', authController.verifyEmail)
router.post('/verify-token', authController.verifyToken)

export { router as authRoutes } 