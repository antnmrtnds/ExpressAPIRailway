"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimitManager = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const logger_1 = require("./logger");
class RateLimitManager {
    constructor() {
        this.defaultOptions = {
            windowMs: 15 * 60 * 1000,
            maxRequests: 100,
            keyPrefix: 'rate_limit'
        };
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        this.redis = new ioredis_1.default(redisUrl, {
            maxRetriesPerRequest: 3,
            lazyConnect: true
        });
        this.redis.on('error', (error) => {
            logger_1.logger.error('Rate limit manager Redis error', { error: error.message });
        });
        this.redis.on('connect', () => {
            logger_1.logger.info('Rate limit manager connected to Redis');
        });
    }
    async checkRateLimit(identifier, options = {}) {
        const config = { ...this.defaultOptions, ...options };
        const key = `${config.keyPrefix}:${identifier}`;
        const now = Date.now();
        const windowStart = now - config.windowMs;
        try {
            await this.redis.zremrangebyscore(key, 0, windowStart);
            const currentRequests = await this.redis.zcard(key);
            const allowed = currentRequests < config.maxRequests;
            if (allowed) {
                await this.redis.zadd(key, now, `${now}-${Math.random()}`);
                await this.redis.expire(key, Math.ceil(config.windowMs / 1000));
            }
            const remainingRequests = Math.max(0, config.maxRequests - currentRequests - (allowed ? 1 : 0));
            const resetTime = now + config.windowMs;
            return {
                allowed,
                remainingRequests,
                resetTime,
                totalRequests: currentRequests + (allowed ? 1 : 0)
            };
        }
        catch (error) {
            logger_1.logger.error('Rate limit check failed', {
                identifier,
                error: error.message
            });
            return {
                allowed: true,
                remainingRequests: config.maxRequests,
                resetTime: now + config.windowMs,
                totalRequests: 0
            };
        }
    }
    async resetRateLimit(identifier, keyPrefix) {
        const prefix = keyPrefix || this.defaultOptions.keyPrefix;
        const key = `${prefix}:${identifier}`;
        try {
            await this.redis.del(key);
            logger_1.logger.info('Rate limit reset', { identifier });
        }
        catch (error) {
            logger_1.logger.error('Failed to reset rate limit', {
                identifier,
                error: error.message
            });
        }
    }
    async getRateLimitStatus(identifier, keyPrefix) {
        const prefix = keyPrefix || this.defaultOptions.keyPrefix;
        const key = `${prefix}:${identifier}`;
        const now = Date.now();
        const windowStart = now - this.defaultOptions.windowMs;
        try {
            await this.redis.zremrangebyscore(key, 0, windowStart);
            const currentRequests = await this.redis.zcard(key);
            return {
                allowed: currentRequests < this.defaultOptions.maxRequests,
                remainingRequests: Math.max(0, this.defaultOptions.maxRequests - currentRequests),
                resetTime: now + this.defaultOptions.windowMs,
                totalRequests: currentRequests
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to get rate limit status', {
                identifier,
                error: error.message
            });
            return null;
        }
    }
    async checkAuthRateLimit(identifier) {
        return this.checkRateLimit(identifier, {
            windowMs: 15 * 60 * 1000,
            maxRequests: 5,
            keyPrefix: 'auth_rate_limit'
        });
    }
    async checkApiRateLimit(identifier) {
        return this.checkRateLimit(identifier, {
            windowMs: 60 * 1000,
            maxRequests: 60,
            keyPrefix: 'api_rate_limit'
        });
    }
    async checkSearchRateLimit(identifier) {
        return this.checkRateLimit(identifier, {
            windowMs: 60 * 60 * 1000,
            maxRequests: 100,
            keyPrefix: 'search_rate_limit'
        });
    }
    async close() {
        await this.redis.quit();
    }
}
exports.rateLimitManager = new RateLimitManager();
process.on('SIGTERM', async () => {
    await exports.rateLimitManager.close();
});
process.on('SIGINT', async () => {
    await exports.rateLimitManager.close();
});
