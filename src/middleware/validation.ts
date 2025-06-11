import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { logger } from '../utils/logger'

const analysisRequestSchema = z.object({
  ads: z.array(z.object({
    id: z.string(),
    platform: z.string(),
    company: z.string().optional(),
    content: z.any()
  })).min(1, 'At least one ad is required'),
  company: z.string().min(1, 'Company name is required'),
  searchId: z.string().optional(),
  analysisType: z.enum(['full', 'priority', 'basic']).optional().default('full')
})

const searchRequestSchema = z.object({
  company: z.string().min(1, 'Company name is required'),
  country: z.string().default('PT'),
  platforms: z.array(z.string()).default(['facebook'])
})

export function validateAnalysisRequest(req: Request, res: Response, next: NextFunction) {
  try {
    const validatedData = analysisRequestSchema.parse(req.body)
    req.body = validatedData
    next()
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Invalid analysis request', { errors: error.errors })
      return res.status(400).json({
        error: 'Invalid request data',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      })
    }
    
    logger.warn('Validation error', { error: error instanceof Error ? error.message : 'Unknown error' })
    res.status(500).json({ error: 'Validation failed' })
  }
}

export function validateSearchRequest(req: Request, res: Response, next: NextFunction) {
  try {
    const validatedData = searchRequestSchema.parse(req.body)
    req.body = validatedData
    next()
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Invalid search request', { errors: error.errors })
      return res.status(400).json({
        error: 'Invalid request data',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      })
    }
    
    logger.warn('Validation error', { error: error instanceof Error ? error.message : 'Unknown error' })
    res.status(500).json({ error: 'Validation failed' })
  }
} 