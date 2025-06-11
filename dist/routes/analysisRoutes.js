"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analysisRoutes = void 0;
const express_1 = require("express");
const http_proxy_middleware_1 = require("http-proxy-middleware");
const auth_1 = require("../middleware/auth");
const rateLimit_1 = require("../middleware/rateLimit");
const validation_1 = require("../middleware/validation");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
exports.analysisRoutes = router;
const ANALYSIS_SERVICE_URL = process.env.ANALYSIS_SERVICE_URL || 'http://localhost:3002';
router.use(auth_1.authMiddleware);
router.use(rateLimit_1.rateLimitMiddleware.general);
router.post('/', validation_1.validateAnalysisRequest, (0, http_proxy_middleware_1.createProxyMiddleware)({
    target: ANALYSIS_SERVICE_URL,
    pathRewrite: { '^/api/v1/analysis': '/api/v1/analysis' },
    changeOrigin: true,
    onProxyReq: (proxyReq, req) => {
        const user = req.user;
        proxyReq.setHeader('X-User-ID', user?.id || 'anonymous');
        proxyReq.setHeader('X-User-Role', user?.role || 'user');
        logger_1.logger.info('Proxying analysis request', {
            userId: user?.id,
            path: req.path,
            adsCount: req.body?.ads?.length
        });
    },
    onError: (err, req, res) => {
        logger_1.logger.error('Analysis service proxy error', { error: err.message });
        res.status(503).json({ error: 'Analysis service unavailable' });
    }
}));
router.get('/:analysisId/status', (0, http_proxy_middleware_1.createProxyMiddleware)({
    target: ANALYSIS_SERVICE_URL,
    pathRewrite: { '^/api/v1/analysis': '/api/v1/analysis' },
    changeOrigin: true,
    onProxyReq: (proxyReq, req) => {
        const user = req.user;
        proxyReq.setHeader('X-User-ID', user?.id || 'anonymous');
    }
}));
router.post('/webhook/n8n-callback', (0, http_proxy_middleware_1.createProxyMiddleware)({
    target: ANALYSIS_SERVICE_URL,
    pathRewrite: { '^/api/v1/analysis': '/api/v1' },
    changeOrigin: true
}));
