"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthController = void 0;
const serviceHealth_1 = require("../utils/serviceHealth");
const redis_1 = require("../config/redis");
const supabase_1 = require("../config/supabase");
const rateLimitManager_1 = require("../utils/rateLimitManager");
const metrics_1 = require("../utils/metrics");
const logger_1 = require("../utils/logger");
exports.healthController = {
    basic(req, res) {
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        });
    },
    async detailed(req, res) {
        try {
            const services = await Promise.allSettled([
                (0, serviceHealth_1.checkServiceHealth)('search', process.env.SEARCH_SERVICE_URL || 'http://localhost:3001'),
                (0, serviceHealth_1.checkServiceHealth)('analysis', process.env.ANALYSIS_SERVICE_URL || 'http://localhost:3002'),
                (0, serviceHealth_1.checkServiceHealth)('results', process.env.RESULTS_SERVICE_URL || 'http://localhost:3003'),
                checkRedisHealth()
            ]);
            const [search, analysis, results, redis] = services;
            const health = {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                services: {
                    search: search.status === 'fulfilled' ? search.value : { status: 'unhealthy', error: search.reason?.message },
                    analysis: analysis.status === 'fulfilled' ? analysis.value : { status: 'unhealthy', error: analysis.reason?.message },
                    results: results.status === 'fulfilled' ? results.value : { status: 'unhealthy', error: results.reason?.message },
                    redis: redis.status === 'fulfilled' ? redis.value : { status: 'unhealthy', error: redis.reason?.message }
                }
            };
            const allHealthy = Object.values(health.services).every(service => service.status === 'healthy');
            health.status = allHealthy ? 'healthy' : 'degraded';
            res.status(allHealthy ? 200 : 503).json(health);
        }
        catch (error) {
            res.status(503).json({
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    },
    async readiness(req, res) {
        try {
            await checkRedisHealth();
            res.json({ status: 'ready' });
        }
        catch (error) {
            res.status(503).json({ status: 'not ready', error: error.message });
        }
    },
    liveness(req, res) {
        res.json({ status: 'alive' });
    },
    async getHealth(req, res) {
        const checks = [];
        const startTime = Date.now();
        try {
            const supabaseHealth = await checkSupabaseHealth();
            checks.push(supabaseHealth);
        }
        catch (error) {
            checks.push({ status: 'unhealthy', service: 'supabase', error: error.message });
        }
        try {
            const rateLimitHealth = await checkRateLimitHealth();
            checks.push(rateLimitHealth);
        }
        catch (error) {
            checks.push({ status: 'unhealthy', service: 'rate-limiter', error: error.message });
        }
        const metrics = metrics_1.metricsCollector.getMetricsSummary();
        const allHealthy = checks.every(check => check.status === 'healthy');
        const responseTime = Date.now() - startTime;
        const healthStatus = {
            status: allHealthy ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
            responseTime,
            version: process.env.npm_package_version || '1.0.0',
            uptime: process.uptime(),
            services: checks,
            metrics
        };
        const statusCode = allHealthy ? 200 : 503;
        res.status(statusCode).json(healthStatus);
        if (!allHealthy) {
            logger_1.logger.warn('Health check failed', { healthStatus });
        }
    },
    async getMetrics(req, res) {
        try {
            const timeWindow = parseInt(req.query.window) || 60000;
            const metrics = metrics_1.metricsCollector.getMetricsSummary(timeWindow);
            res.json({
                success: true,
                data: metrics
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to get metrics', { error: error.message });
            res.status(500).json({
                error: 'Failed to retrieve metrics',
                details: error.message
            });
        }
    }
};
async function checkRedisHealth() {
    try {
        await redis_1.redisClient.ping();
        return { status: 'healthy', service: 'redis' };
    }
    catch (error) {
        throw new Error(`Redis health check failed: ${error.message}`);
    }
}
async function checkSupabaseHealth() {
    try {
        const { error } = await supabase_1.supabase
            .from('users')
            .select('count')
            .limit(1);
        if (error)
            throw error;
        return { status: 'healthy', service: 'supabase' };
    }
    catch (error) {
        throw new Error(`Supabase health check failed: ${error.message}`);
    }
}
async function checkRateLimitHealth() {
    try {
        const result = await rateLimitManager_1.rateLimitManager.getRateLimitStatus('health-check');
        return {
            status: 'healthy',
            service: 'rate-limiter',
            details: result ? 'Connected to Redis' : 'Redis connection issue'
        };
    }
    catch (error) {
        throw new Error(`Rate limiter health check failed: ${error.message}`);
    }
}
