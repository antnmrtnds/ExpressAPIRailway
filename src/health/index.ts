import { Express } from 'express'
import { healthController } from './healthController'

export function setupHealthCheck(app: Express) {
  app.get('/health', healthController.basic)
  app.get('/health/detailed', healthController.detailed)
  app.get('/health/ready', healthController.readiness)
  app.get('/health/live', healthController.liveness)
} 