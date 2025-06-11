"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsCollector = void 0;
const logger_1 = require("./logger");
class MetricsCollector {
    constructor() {
        this.metrics = [];
        this.maxMetrics = 1000;
    }
    recordRequest(data) {
        this.metrics.push(data);
        if (this.metrics.length > this.maxMetrics) {
            this.metrics = this.metrics.slice(-this.maxMetrics);
        }
        if (data.responseTime > 5000) {
            logger_1.logger.warn('Slow request detected', {
                path: data.path,
                method: data.method,
                responseTime: data.responseTime,
                statusCode: data.statusCode
            });
        }
        if (data.statusCode >= 400) {
            logger_1.logger.warn('Request resulted in error', {
                path: data.path,
                method: data.method,
                statusCode: data.statusCode,
                responseTime: data.responseTime
            });
        }
    }
    getMetrics() {
        return [...this.metrics];
    }
    getMetricsSummary(timeWindowMs = 60000) {
        const cutoff = Date.now() - timeWindowMs;
        const recentMetrics = this.metrics.filter(m => m.timestamp > cutoff);
        if (recentMetrics.length === 0) {
            return {
                totalRequests: 0,
                averageResponseTime: 0,
                errorRate: 0,
                timeWindow: timeWindowMs
            };
        }
        const totalRequests = recentMetrics.length;
        const totalResponseTime = recentMetrics.reduce((sum, m) => sum + m.responseTime, 0);
        const averageResponseTime = totalResponseTime / totalRequests;
        const errorCount = recentMetrics.filter(m => m.statusCode >= 400).length;
        const errorRate = (errorCount / totalRequests) * 100;
        const statusCodes = recentMetrics.reduce((acc, m) => {
            acc[m.statusCode] = (acc[m.statusCode] || 0) + 1;
            return acc;
        }, {});
        const endpoints = recentMetrics.reduce((acc, m) => {
            const key = `${m.method} ${m.path}`;
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
        return {
            totalRequests,
            averageResponseTime: Math.round(averageResponseTime),
            errorRate: Math.round(errorRate * 100) / 100,
            timeWindow: timeWindowMs,
            statusCodes,
            topEndpoints: Object.entries(endpoints)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})
        };
    }
    clearMetrics() {
        this.metrics = [];
        logger_1.logger.info('Metrics cleared');
    }
}
exports.metricsCollector = new MetricsCollector();
