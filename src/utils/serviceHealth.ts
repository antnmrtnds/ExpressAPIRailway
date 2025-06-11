import axios from 'axios'
import { logger } from './logger'

interface ServiceHealthResult {
  status: 'healthy' | 'unhealthy'
  service: string
  responseTime?: number
  error?: string
}

export async function checkServiceHealth(
  serviceName: string, 
  serviceUrl: string
): Promise<ServiceHealthResult> {
  const startTime = Date.now()
  
  try {
    const response = await axios.get(`${serviceUrl}/health`, {
      timeout: 5000
    })
    
    const responseTime = Date.now() - startTime
    
    if (response.status === 200) {
      return {
        status: 'healthy',
        service: serviceName,
        responseTime
      }
    }
    
    throw new Error(`Service returned status ${response.status}`)
  } catch (error) {
    const responseTime = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    logger.warn(`Service health check failed`, { 
      service: serviceName, 
      url: serviceUrl, 
      error: errorMessage 
    })
    
    return {
      status: 'unhealthy',
      service: serviceName,
      responseTime,
      error: errorMessage
    }
  }
} 