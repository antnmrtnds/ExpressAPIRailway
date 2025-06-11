"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsMiddleware = metricsMiddleware;
const metrics_1 = require("../utils/metrics");
function metricsMiddleware(req, res, next) {
    const startTime = Date.now();
    const originalEnd = res.end;
    res.end = function (chunk, encoding, cb) {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        metrics_1.metricsCollector.recordRequest({
            timestamp: endTime,
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            responseTime,
            userAgent: req.get('User-Agent'),
            ip: req.ip || req.connection.remoteAddress,
            userId: req.user?.id
        });
        originalEnd.call(this, chunk, encoding, cb);
    };
    next();
}
