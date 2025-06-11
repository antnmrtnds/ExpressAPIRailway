import { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { supabase } from '../config/supabase'
import { logger } from '../utils/logger'
import { rateLimitManager } from '../utils/rateLimitManager'

// Ensure JWT_SECRET exists and cast it properly
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  console.error('JWT_SECRET environment variable must be set')
  process.exit(1)
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h'
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d'

export class AuthController {
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body
      
      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' })
        return
      }
      
      logger.info('Login attempt', { email })
      
      // Check rate limit for this IP
      const rateLimitResult = await rateLimitManager.checkAuthRateLimit(req.ip || 'unknown')
      if (!rateLimitResult.allowed) {
        res.status(429).json({ 
          error: 'Too many login attempts', 
          resetTime: new Date(rateLimitResult.resetTime).toISOString() 
        })
        return
      }
      
      // Get user from database
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single()
      
      if (error || !user || !user.password_hash) {
        logger.warn('Login failed - user not found or no password hash', { email })
        res.status(401).json({ error: 'Invalid credentials' })
        return
      }
      
      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash)
      if (!isValidPassword) {
        logger.warn('Login failed - invalid password', { email })
        res.status(401).json({ error: 'Invalid credentials' })
        return
      }
      
      // Generate tokens - be more explicit with types
      const accessToken = jwt.sign(
        { 
          id: user.id, 
          email: user.email, 
          role: user.role 
        } as object,
        JWT_SECRET!,
        { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
      )
      
      const refreshToken = jwt.sign(
        { id: user.id, type: 'refresh' } as object,
        JWT_SECRET!,
        { expiresIn: REFRESH_TOKEN_EXPIRES_IN } as jwt.SignOptions
      )
      
      // Update last login
      await supabase
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', user.id)
      
      logger.info('Login successful', { userId: user.id, email })
      
      res.set('X-Content-Type-Options', 'nosniff')
      res.set('X-Frame-Options', 'DENY')
      res.json({
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.name
        },
        accessToken,
        refreshToken
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error('Login error', { error: errorMessage })
      res.status(500).json({ error: 'Internal server error' })
    }
  }
  
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, name } = req.body
      
      if (!email || !password || !name) {
        res.status(400).json({ error: 'Email, password, and name are required' })
        return
      }
      
      // Add email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        res.status(400).json({ error: 'Invalid email format' })
        return
      }
      
      // Add password strength validation
      if (password.length < 8) {
        res.status(400).json({ error: 'Password must be at least 8 characters long' })
        return
      }
      
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single()
      
      if (existingUser) {
        res.status(409).json({ error: 'User already exists' })
        return
      }
      
      // Hash password
      const passwordHash = await bcrypt.hash(password, 12)
      
      // Create user
      const { data: user, error } = await supabase
        .from('users')
        .insert({
          email,
          password_hash: passwordHash,
          name,
          role: 'user',
          created_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (error) {
        throw error
      }
      
      logger.info('User registered successfully', { userId: user.id, email })
      
      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      })
    } catch (error) {
      logger.error('Registration error', { error: error instanceof Error ? error.message : 'Unknown error' })
      res.status(500).json({ error: 'Internal server error' })
    }
  }
  
  async refresh(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body
      
      if (!refreshToken) {
        res.status(400).json({ error: 'Refresh token is required' })
        return
      }
      
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, JWT_SECRET!) as unknown as { id: string; type: string; iat: number; exp: number }
      
      if (decoded.type !== 'refresh') {
        res.status(401).json({ error: 'Invalid refresh token' })
        return
      }
      
      // Get user
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, role, name')
        .eq('id', decoded.id)
        .single()
      
      if (error || !user) {
        res.status(401).json({ error: 'Invalid refresh token' })
        return
      }
      
      // Generate new access token
      const accessToken = jwt.sign(
        { 
          id: user.id, 
          email: user.email, 
          role: user.role 
        } as object,
        JWT_SECRET!,
        { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
      )
      
      res.json({ accessToken })
    } catch (error) {
      logger.error('Token refresh error', { error: error instanceof Error ? error.message : 'Unknown error' })
      res.status(500).json({ error: 'Internal server error' })
    }
  }
  
  async logout(req: Request, res: Response): Promise<void> {
    // In a production app, you might want to blacklist the token
    res.json({ message: 'Logged out successfully' })
  }
  
  async forgotPassword(req: Request, res: Response): Promise<void> {
    // Implement password reset logic
    res.json({ message: 'Password reset email sent' })
  }
  
  async resetPassword(req: Request, res: Response): Promise<void> {
    // Implement password reset logic
    res.json({ message: 'Password reset successfully' })
  }
  
  async verifyEmail(req: Request, res: Response): Promise<void> {
    // Implement email verification logic
    res.json({ message: 'Email verified successfully' })
  }
  
  async verifyToken(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body
      
      if (!token) {
        res.status(400).json({ error: 'Token is required' })
        return
      }
      
      const decoded = jwt.verify(token, JWT_SECRET!) as unknown as any
      
      // Get user to ensure they still exist
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, role, name')
        .eq('id', decoded.id)
        .single()
      
      if (error || !user) {
        res.status(401).json({ error: 'Invalid token' })
        return
      }
      
      res.json({ 
        valid: true, 
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.name
        }
      })
    } catch (error) {
      res.status(401).json({ error: 'Invalid token', valid: false })
    }
  }
} 