"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupHealthCheck = setupHealthCheck;
const healthController_1 = require("./healthController");
function setupHealthCheck(app) {
    app.get('/health', healthController_1.healthController.basic);
    app.get('/health/detailed', healthController_1.healthController.detailed);
    app.get('/health/ready', healthController_1.healthController.readiness);
    app.get('/health/live', healthController_1.healthController.liveness);
}
