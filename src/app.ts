import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { setupRoutes } from './routes'
import { setupMiddleware } from './middleware'
import { setupHealthCheck } from './health'
import { logger } from './utils/logger'
import { metricsMiddleware } from './middleware/metrics'
import { authRoutes } from './routes/authRoutes'

const app = express()
const PORT = process.env.PORT || 3000

// Debug logging for environment variables
console.log('ALLOWED_ORIGINS:', process.env.ALLOWED_ORIGINS)
console.log('NODE_ENV:', process.env.NODE_ENV)

// Security middleware
app.use(helmet())

// CORS configuration with detailed logging
const corsOptions = {
  origin: (origin: string | undefined, callback: Function) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || ['http://localhost:3000']
    console.log('CORS check - Origin:', origin, 'Allowed:', allowedOrigins)
    
    // Allow requests with no origin (e.g. mobile apps, curl)
    if (!origin) return callback(null, true)
    
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true)
    } else {
      return callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}

app.use(cors(corsOptions))

// Basic middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Metrics collection
app.use(metricsMiddleware)

// Setup middleware (auth, rate limiting, etc.)
setupMiddleware(app)

// Setup routes
setupRoutes(app)

// Health check
setupHealthCheck(app)

// Auth routes
app.use('/api/auth', authRoutes)

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error in API Gateway', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method
  })
  
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  })
})

app.listen(PORT, () => {
  logger.info(`API Gateway running on port ${PORT}`)
  logger.info(`ALLOWED_ORIGINS: ${process.env.ALLOWED_ORIGINS}`)
})

export default app
