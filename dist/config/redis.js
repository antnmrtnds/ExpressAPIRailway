"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisClient = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const logger_1 = require("../utils/logger");
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
exports.redisClient = new ioredis_1.default(REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    enableReadyCheck: true,
    enableOfflineQueue: false
});
exports.redisClient.on('connect', () => {
    logger_1.logger.info('API Gateway connected to Redis');
});
exports.redisClient.on('error', (error) => {
    logger_1.logger.error('API Gateway Redis connection error', { error: error.message });
});
exports.redisClient.on('ready', () => {
    logger_1.logger.info('API Gateway Redis connection ready');
});
process.on('SIGTERM', async () => {
    await exports.redisClient.quit();
});
process.on('SIGINT', async () => {
    await exports.redisClient.quit();
});
