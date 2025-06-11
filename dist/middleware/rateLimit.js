"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimitMiddleware = void 0;
exports.authRateLimitMiddleware = authRateLimitMiddleware;
const rateLimitManager_1 = require("../utils/rateLimitManager");
const logger_1 = require("../utils/logger");
function generalRateLimitMiddleware(req, res, next) {
    if (req.path === '/health') {
        return next();
    }
    const identifier = req.ip || 'unknown';
    rateLimitManager_1.rateLimitManager.checkApiRateLimit(identifier)
        .then(result => {
        res.set({
            'X-RateLimit-Limit': '60',
            'X-RateLimit-Remaining': result.remainingRequests.toString(),
            'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
        });
        if (!result.allowed) {
            logger_1.logger.warn('Rate limit exceeded', {
                ip: identifier,
                path: req.path,
                method: req.method
            });
            return res.status(429).json({
                error: 'Too many requests',
                message: 'Rate limit exceeded. Please try again later.',
                resetTime: new Date(result.resetTime).toISOString()
            });
        }
        next();
    })
        .catch(error => {
        logger_1.logger.error('Rate limit check failed', { error: error.message });
        next();
    });
}
function authRateLimitMiddleware(req, res, next) {
    const identifier = req.ip || 'unknown';
    rateLimitManager_1.rateLimitManager.checkAuthRateLimit(identifier)
        .then(result => {
        res.set({
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': result.remainingRequests.toString(),
            'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
        });
        if (!result.allowed) {
            logger_1.logger.warn('Rate limit reached for auth endpoint', {
                ip: identifier,
                path: req.path,
                method: req.method
            });
            return res.status(429).json({
                error: 'Too many authentication attempts',
                message: 'Please wait before trying again.',
                resetTime: new Date(result.resetTime).toISOString()
            });
        }
        next();
    })
        .catch(error => {
        logger_1.logger.error('Auth rate limit check failed', { error: error.message });
        next();
    });
}
exports.rateLimitMiddleware = {
    general: generalRateLimitMiddleware,
    auth: authRateLimitMiddleware
};
