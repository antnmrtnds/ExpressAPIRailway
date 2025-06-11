"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resultsRoutes = void 0;
const express_1 = require("express");
const http_proxy_middleware_1 = require("http-proxy-middleware");
const auth_1 = require("../middleware/auth");
const rateLimit_1 = require("../middleware/rateLimit");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
exports.resultsRoutes = router;
const RESULTS_SERVICE_URL = process.env.RESULTS_SERVICE_URL || 'http://localhost:3003';
router.use(auth_1.authMiddleware);
router.use(rateLimit_1.rateLimitMiddleware.general);
router.get('/', (0, http_proxy_middleware_1.createProxyMiddleware)({
    target: RESULTS_SERVICE_URL,
    pathRewrite: { '^/api/v1/results': '/api/v1/results' },
    changeOrigin: true,
    onProxyReq: (proxyReq, req) => {
        const user = req.user;
        proxyReq.setHeader('X-User-ID', user?.id || 'anonymous');
        proxyReq.setHeader('X-User-Role', user?.role || 'user');
        if (user?.role !== 'admin') {
        }
    }
}));
router.get('/:analysisId', (0, http_proxy_middleware_1.createProxyMiddleware)({
    target: RESULTS_SERVICE_URL,
    pathRewrite: { '^/api/v1/results': '/api/v1/results' },
    changeOrigin: true,
    onProxyReq: (proxyReq, req) => {
        const user = req.user;
        proxyReq.setHeader('X-User-ID', user?.id || 'anonymous');
    }
}));
router.post('/', (0, http_proxy_middleware_1.createProxyMiddleware)({
    target: RESULTS_SERVICE_URL,
    pathRewrite: { '^/api/v1/results': '/api/v1/results' },
    changeOrigin: true,
    onProxyReq: (proxyReq, req) => {
        const user = req.user;
        proxyReq.setHeader('X-User-ID', user?.id || 'anonymous');
        logger_1.logger.info('Proxying save results request', {
            userId: user?.id,
            resultsCount: Array.isArray(req.body) ? req.body.length : 1
        });
    }
}));
router.delete('/:resultId', (0, http_proxy_middleware_1.createProxyMiddleware)({
    target: RESULTS_SERVICE_URL,
    pathRewrite: { '^/api/v1/results': '/api/v1/results' },
    changeOrigin: true,
    onProxyReq: (proxyReq, req) => {
        const user = req.user;
        proxyReq.setHeader('X-User-ID', user?.id || 'anonymous');
    }
}));
router.get('/stats/summary', (0, http_proxy_middleware_1.createProxyMiddleware)({
    target: RESULTS_SERVICE_URL,
    pathRewrite: { '^/api/v1/results': '/api/v1' },
    changeOrigin: true,
    onProxyReq: (proxyReq, req) => {
        const user = req.user;
        proxyReq.setHeader('X-User-ID', user?.id || 'anonymous');
    }
}));
