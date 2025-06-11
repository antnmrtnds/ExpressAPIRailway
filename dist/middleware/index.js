"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupMiddleware = setupMiddleware;
const rateLimit_1 = require("./rateLimit");
const requestLogger_1 = require("./requestLogger");
const security_1 = require("./security");
function setupMiddleware(app) {
    app.use(requestLogger_1.requestLogger);
    app.use(security_1.securityHeaders);
    app.use(rateLimit_1.rateLimitMiddleware.general);
}
