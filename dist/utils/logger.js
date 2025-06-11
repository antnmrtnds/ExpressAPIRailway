"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
};
const currentLogLevel = LOG_LEVELS[process.env.LOG_LEVEL] ?? LOG_LEVELS.INFO;
class Logger {
    formatMessage(level, message, meta) {
        const timestamp = new Date().toISOString();
        const service = 'api-gateway';
        const logEntry = {
            timestamp,
            level,
            service,
            message,
            ...(meta && { meta })
        };
        return JSON.stringify(logEntry);
    }
    error(message, meta) {
        if (currentLogLevel >= LOG_LEVELS.ERROR) {
            console.error(this.formatMessage('ERROR', message, meta));
        }
    }
    warn(message, meta) {
        if (currentLogLevel >= LOG_LEVELS.WARN) {
            console.warn(this.formatMessage('WARN', message, meta));
        }
    }
    info(message, meta) {
        if (currentLogLevel >= LOG_LEVELS.INFO) {
            console.log(this.formatMessage('INFO', message, meta));
        }
    }
    debug(message, meta) {
        if (currentLogLevel >= LOG_LEVELS.DEBUG) {
            console.log(this.formatMessage('DEBUG', message, meta));
        }
    }
}
exports.logger = new Logger();
