import { Router } from 'express'
import { AuthController } from '../controllers/authController'
import { authRateLimitMiddleware } from '../middleware/rateLimit'

const router = Router()
const authController = new AuthController()

// Apply strict rate limiting for auth endpoints
router.use(authRateLimitMiddleware)

// Authentication endpoints
router.post('/login', (req, res) => authController.login(req, res))
router.post('/register', (req, res) => authController.register(req, res))
router.post('/refresh', (req, res) => authController.refresh(req, res))
router.post('/logout', (req, res) => authController.logout(req, res))
router.post('/forgot-password', (req, res) => authController.forgotPassword(req, res))
router.post('/reset-password', (req, res) => authController.resetPassword(req, res))

// Verification endpoints
router.post('/verify-email', (req, res) => authController.verifyEmail(req, res))
router.post('/verify-token', (req, res) => authController.verifyToken(req, res))

export { router as authRoutes } 