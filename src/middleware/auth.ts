import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { logger } from '../utils/logger'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email: string
    role: string
  }
}

export function authMiddleware(
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access token required' })
    }
    
    const token = authHeader.substring(7) // Remove 'Bearer '
    
    const decoded = jwt.verify(token, JWT_SECRET) as any
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    }
    
    next()
  } catch (error) {
    logger.warn('Authentication failed', { error: error instanceof Error ? error.message : 'Unknown error' })
    res.status(401).json({ error: 'Invalid access token' })
  }
}

export function adminMiddleware(
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}

export function optionalAuth(
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const decoded = jwt.verify(token, JWT_SECRET) as any
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role
      }
    }
    
    next()
  } catch (error) {
    // Continue without authentication
    next()
  }
} 