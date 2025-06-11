"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchRoutes = void 0;
const express_1 = require("express");
const http_proxy_middleware_1 = require("http-proxy-middleware");
const auth_1 = require("../middleware/auth");
const rateLimit_1 = require("../middleware/rateLimit");
const validation_1 = require("../middleware/validation");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
exports.searchRoutes = router;
const SEARCH_SERVICE_URL = process.env.SEARCH_SERVICE_URL || 'http://localhost:3001';
router.use(auth_1.authMiddleware);
router.use(rateLimit_1.rateLimitMiddleware.general);
router.post('/ads', validation_1.validateSearchRequest, (0, http_proxy_middleware_1.createProxyMiddleware)({
    target: SEARCH_SERVICE_URL,
    pathRewrite: { '^/api/v1/search': '/api/v1/search' },
    changeOrigin: true,
    onProxyReq: (proxyReq, req) => {
        const user = req.user;
        proxyReq.setHeader('X-User-ID', user?.id || 'anonymous');
        proxyReq.setHeader('X-User-Role', user?.role || 'user');
        logger_1.logger.info('Proxying search request', {
            userId: user?.id,
            path: req.path,
            company: req.body?.company
        });
    },
    onError: (err, req, res) => {
        logger_1.logger.error('Search service proxy error', { error: err.message });
        res.status(503).json({ error: 'Search service unavailable' });
    }
}));
router.get('/:searchId/status', (0, http_proxy_middleware_1.createProxyMiddleware)({
    target: SEARCH_SERVICE_URL,
    pathRewrite: { '^/api/v1/search': '/api/v1/search' },
    changeOrigin: true,
    onProxyReq: (proxyReq, req) => {
        const user = req.user;
        proxyReq.setHeader('X-User-ID', user?.id || 'anonymous');
    }
}));
