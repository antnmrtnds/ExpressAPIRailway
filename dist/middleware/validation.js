"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAnalysisRequest = validateAnalysisRequest;
exports.validateSearchRequest = validateSearchRequest;
const zod_1 = require("zod");
const logger_1 = require("../utils/logger");
const analysisRequestSchema = zod_1.z.object({
    ads: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        platform: zod_1.z.string(),
        company: zod_1.z.string().optional(),
        content: zod_1.z.any()
    })).min(1, 'At least one ad is required'),
    company: zod_1.z.string().min(1, 'Company name is required'),
    searchId: zod_1.z.string().optional(),
    analysisType: zod_1.z.enum(['full', 'priority', 'basic']).optional().default('full')
});
const searchRequestSchema = zod_1.z.object({
    company: zod_1.z.string().min(1, 'Company name is required'),
    country: zod_1.z.string().default('PT'),
    platforms: zod_1.z.array(zod_1.z.string()).default(['facebook'])
});
function validateAnalysisRequest(req, res, next) {
    try {
        const validatedData = analysisRequestSchema.parse(req.body);
        req.body = validatedData;
        next();
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            logger_1.logger.warn('Invalid analysis request', { errors: error.errors });
            return res.status(400).json({
                error: 'Invalid request data',
                details: error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message
                }))
            });
        }
        logger_1.logger.error('Validation error', { error: error.message });
        res.status(500).json({ error: 'Validation failed' });
    }
}
function validateSearchRequest(req, res, next) {
    try {
        const validatedData = searchRequestSchema.parse(req.body);
        req.body = validatedData;
        next();
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            logger_1.logger.warn('Invalid search request', { errors: error.errors });
            return res.status(400).json({
                error: 'Invalid request data',
                details: error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message
                }))
            });
        }
        logger_1.logger.error('Validation error', { error: error.message });
        res.status(500).json({ error: 'Validation failed' });
    }
}
