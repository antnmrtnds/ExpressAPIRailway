interface LogLevel {
  ERROR: 0
  WARN: 1
  INFO: 2
  DEBUG: 3
}

const LOG_LEVELS: LogLevel = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
}

const currentLogLevel = LOG_LEVELS[process.env.LOG_LEVEL as keyof LogLevel] ?? LOG_LEVELS.INFO

class Logger {
  private formatMessage(level: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString()
    const service = 'api-gateway'
    
    const logEntry = {
      timestamp,
      level,
      service,
      message,
      ...(meta && { meta })
    }
    
    return JSON.stringify(logEntry)
  }

  error(message: string, meta?: any): void {
    if (currentLogLevel >= LOG_LEVELS.ERROR) {
      console.error(this.formatMessage('ERROR', message, meta))
    }
  }

  warn(message: string, meta?: any): void {
    if (currentLogLevel >= LOG_LEVELS.WARN) {
      console.warn(this.formatMessage('WARN', message, meta))
    }
  }

  info(message: string, meta?: any): void {
    if (currentLogLevel >= LOG_LEVELS.INFO) {
      console.log(this.formatMessage('INFO', message, meta))
    }
  }

  debug(message: string, meta?: any): void {
    if (currentLogLevel >= LOG_LEVELS.DEBUG) {
      console.log(this.formatMessage('DEBUG', message, meta))
    }
  }
}

export const logger = new Logger() 