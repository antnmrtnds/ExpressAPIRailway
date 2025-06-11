"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const supabase_1 = require("../config/supabase");
const logger_1 = require("../utils/logger");
const rateLimitManager_1 = require("../utils/rateLimitManager");
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('JWT_SECRET environment variable must be set');
    process.exit(1);
}
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';
class AuthController {
    async login(req, res) {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                return res.status(400).json({ error: 'Email and password are required' });
            }
            logger_1.logger.info('Login attempt', { email });
            const rateLimitResult = await rateLimitManager_1.rateLimitManager.checkAuthRateLimit(req.ip || 'unknown');
            if (!rateLimitResult.allowed) {
                return res.status(429).json({
                    error: 'Too many login attempts',
                    resetTime: new Date(rateLimitResult.resetTime).toISOString()
                });
            }
            const { data: user, error } = await supabase_1.supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .single();
            if (error || !user || !user.password_hash) {
                logger_1.logger.warn('Login failed - user not found or no password hash', { email });
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            const isValidPassword = await bcrypt_1.default.compare(password, user.password_hash);
            if (!isValidPassword) {
                logger_1.logger.warn('Login failed - invalid password', { email });
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            const accessToken = jsonwebtoken_1.default.sign({
                id: user.id,
                email: user.email,
                role: user.role
            }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
            const refreshToken = jsonwebtoken_1.default.sign({ id: user.id, type: 'refresh' }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
            await supabase_1.supabase
                .from('users')
                .update({ last_login_at: new Date().toISOString() })
                .eq('id', user.id);
            logger_1.logger.info('Login successful', { userId: user.id, email });
            res.set('X-Content-Type-Options', 'nosniff');
            res.set('X-Frame-Options', 'DENY');
            res.json({
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    name: user.name
                },
                accessToken,
                refreshToken
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_1.logger.error('Login error', { error: errorMessage });
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    async register(req, res) {
        try {
            const { email, password, name } = req.body;
            if (!email || !password || !name) {
                return res.status(400).json({ error: 'Email, password, and name are required' });
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({ error: 'Invalid email format' });
            }
            if (password.length < 8) {
                return res.status(400).json({ error: 'Password must be at least 8 characters long' });
            }
            const { data: existingUser } = await supabase_1.supabase
                .from('users')
                .select('id')
                .eq('email', email)
                .single();
            if (existingUser) {
                return res.status(409).json({ error: 'User already exists' });
            }
            const passwordHash = await bcrypt_1.default.hash(password, 12);
            const { data: user, error } = await supabase_1.supabase
                .from('users')
                .insert({
                email,
                password_hash: passwordHash,
                name,
                role: 'user',
                created_at: new Date().toISOString()
            })
                .select()
                .single();
            if (error) {
                throw error;
            }
            logger_1.logger.info('User registered successfully', { userId: user.id, email });
            res.status(201).json({
                message: 'User registered successfully',
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role
                }
            });
        }
        catch (error) {
            logger_1.logger.error('Registration error', { error: error.message });
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    async refresh(req, res) {
        try {
            const { refreshToken } = req.body;
            if (!refreshToken) {
                return res.status(400).json({ error: 'Refresh token is required' });
            }
            const decoded = jsonwebtoken_1.default.verify(refreshToken, JWT_SECRET);
            if (decoded.type !== 'refresh') {
                return res.status(401).json({ error: 'Invalid refresh token' });
            }
            const { data: user, error } = await supabase_1.supabase
                .from('users')
                .select('id, email, role, name')
                .eq('id', decoded.id)
                .single();
            if (error || !user) {
                return res.status(401).json({ error: 'Invalid refresh token' });
            }
            const accessToken = jsonwebtoken_1.default.sign({
                id: user.id,
                email: user.email,
                role: user.role
            }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
            res.json({ accessToken });
        }
        catch (error) {
            logger_1.logger.error('Token refresh error', { error: error.message });
            res.status(401).json({ error: 'Invalid refresh token' });
        }
    }
    async logout(req, res) {
        res.json({ message: 'Logged out successfully' });
    }
    async forgotPassword(req, res) {
        res.json({ message: 'Password reset email sent' });
    }
    async resetPassword(req, res) {
        res.json({ message: 'Password reset successfully' });
    }
    async verifyEmail(req, res) {
        res.json({ message: 'Email verified successfully' });
    }
    async verifyToken(req, res) {
        try {
            const { token } = req.body;
            if (!token) {
                return res.status(400).json({ error: 'Token is required' });
            }
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            const { data: user, error } = await supabase_1.supabase
                .from('users')
                .select('id, email, role, name')
                .eq('id', decoded.id)
                .single();
            if (error || !user) {
                return res.status(401).json({ error: 'Invalid token' });
            }
            res.json({
                valid: true,
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    name: user.name
                }
            });
        }
        catch (error) {
            res.status(401).json({ error: 'Invalid token', valid: false });
        }
    }
}
exports.AuthController = AuthController;
