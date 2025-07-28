import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { app } from './app';
import serverless from 'serverless-http';

// Convert Express app to Lambda handler
const handler = serverless(app);

export const apiHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    // Call the serverless handler
    const result = await handler(event, context) as APIGatewayProxyResult;
    
    // Ensure CORS headers are present
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      ...(result.headers || {})
    };

    return {
      statusCode: result.statusCode,
      headers,
      body: result.body,
      isBase64Encoded: result.isBase64Encoded || false
    };
  } catch (error) {
    console.error('Lambda handler error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An internal server error occurred'
        },
        timestamp: new Date().toISOString()
      })
    };
  }
};

// Health check handler
export const healthHandler = async (): Promise<APIGatewayProxyResult> => {
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'production',
        region: process.env.AWS_REGION || 'us-east-1'
      }
    })
  };
};
