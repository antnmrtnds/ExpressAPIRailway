"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRoutes = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const rateLimit_1 = require("../middleware/rateLimit");
const router = (0, express_1.Router)();
exports.adminRoutes = router;
router.use(auth_1.authMiddleware);
router.use(rateLimit_1.rateLimitMiddleware.general);
router.use((req, res, next) => {
    const user = req.user;
    if (user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
});
router.get('/users', (req, res) => {
    res.json({ message: 'Get users - admin endpoint' });
});
router.get('/metrics', (req, res) => {
    res.json({ message: 'Get system metrics - admin endpoint' });
});
