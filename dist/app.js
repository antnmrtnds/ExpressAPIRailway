"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const routes_1 = require("./routes");
const middleware_1 = require("./middleware");
const health_1 = require("./health");
const logger_1 = require("./utils/logger");
const metrics_1 = require("./middleware/metrics");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use(metrics_1.metricsMiddleware);
(0, middleware_1.setupMiddleware)(app);
(0, routes_1.setupRoutes)(app);
(0, health_1.setupHealthCheck)(app);
app.use((error, req, res, next) => {
    logger_1.logger.error('Unhandled error in API Gateway', {
        error: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method
    });
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});
app.listen(PORT, () => {
    logger_1.logger.info(`API Gateway running on port ${PORT}`);
});
exports.default = app;
