import { Express } from 'express'
import { searchRoutes } from './searchRoutes'
import { analysisRoutes } from './analysisRoutes'
import { resultsRoutes } from './resultsRoutes'
import { authRoutes } from './authRoutes'
import { adminRoutes } from './adminRoutes'

export function setupRoutes(app: Express) {
  // API versioning
  const apiV1 = '/api/v1'
  
  // Authentication routes (no auth required)
  app.use(`${apiV1}/auth`, authRoutes)
  
  // Main service routes (auth required)
  app.use(`${apiV1}/search`, searchRoutes)
  app.use(`${apiV1}/analysis`, analysisRoutes)
  app.use(`${apiV1}/results`, resultsRoutes)
  
  // Admin routes (admin auth required)
  app.use(`${apiV1}/admin`, adminRoutes)
  
  // API documentation
  app.get(`${apiV1}/docs`, (req, res) => {
    res.json({
      version: '1.0.0',
      endpoints: {
        auth: `${apiV1}/auth`,
        search: `${apiV1}/search`,
        analysis: `${apiV1}/analysis`,
        results: `${apiV1}/results`,
        admin: `${apiV1}/admin`
      },
      documentation: 'https://docs.upspy.com/api'
    })
  })
} 