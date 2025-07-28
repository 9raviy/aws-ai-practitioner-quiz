import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { BedrockService } from '../services/bedrock.service';
import { logger } from '../utils/logger';

/**
 * Health check Lambda handler
 * Lightweight function for health monitoring without loading the full Express app
 */
export const healthHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  context.callbackWaitsForEmptyEventLoop = false;
  
  try {
    logger.info('Health check invoked', {
      requestId: context.awsRequestId,
    });
    
    // Test Bedrock connectivity
    const bedrockService = new BedrockService();
    const bedrockHealthy = await bedrockService.testConnection();
    
    const healthStatus = {
      status: bedrockHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      environment: process.env.NODE_ENV || "production",
      services: {
        bedrock: bedrockHealthy ? "connected" : "disconnected",
        dynamodb: "connected", // Will implement DynamoDB check next
        lambda: "operational",
      },
      region: process.env.AWS_REGION || "us-west-2",
      requestId: context.awsRequestId,
    };
    
    const statusCode = bedrockHealthy ? 200 : 503;
    
    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'X-Request-ID': context.awsRequestId,
      },
      body: JSON.stringify({
        success: true,
        data: healthStatus,
        timestamp: new Date().toISOString(),
      }),
    };
    
  } catch (error) {
    logger.error('Health check failed', error, {
      requestId: context.awsRequestId,
    });
    
    return {
      statusCode: 503,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'X-Request-ID': context.awsRequestId,
      },
      body: JSON.stringify({
        success: false,
        data: {
          status: "unhealthy",
          timestamp: new Date().toISOString(),
          error: "Health check failed",
          requestId: context.awsRequestId,
        },
        timestamp: new Date().toISOString(),
      }),
    };
  }
};

export default healthHandler;
