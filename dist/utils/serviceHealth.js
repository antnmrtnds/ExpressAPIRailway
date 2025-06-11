"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkServiceHealth = checkServiceHealth;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("./logger");
async function checkServiceHealth(serviceName, serviceUrl) {
    const startTime = Date.now();
    try {
        const response = await axios_1.default.get(`${serviceUrl}/health`, {
            timeout: 5000
        });
        const responseTime = Date.now() - startTime;
        if (response.status === 200) {
            return {
                status: 'healthy',
                service: serviceName,
                responseTime
            };
        }
        throw new Error(`Service returned status ${response.status}`);
    }
    catch (error) {
        const responseTime = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger_1.logger.warn(`Service health check failed`, {
            service: serviceName,
            url: serviceUrl,
            error: errorMessage
        });
        return {
            status: 'unhealthy',
            service: serviceName,
            responseTime,
            error: errorMessage
        };
    }
}
