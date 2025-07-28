import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import serverless from 'serverless-http';
import app from '../app';
import { logger } from '../utils/logger';

// Configure the serverless wrapper for our Express app
const serverlessHandler = serverless(app, {
  // Handle binary media types if needed (for file uploads, etc.)
  binary: ['image/*', 'application/octet-stream'],
  
  // Custom request and response handling
  request: (request: any, event: APIGatewayProxyEvent, context: Context) => {
    // Add AWS context to the request for potential use in middleware
    request.awsEvent = event;
    request.awsContext = context;
    
    // Add request ID for tracking
    request.requestId = context.awsRequestId;
  },
  
  response: (response: any, event: APIGatewayProxyEvent, context: Context) => {
    // Add custom headers for AWS Lambda
    response.headers = {
      ...response.headers,
      'X-Request-ID': context.awsRequestId,
      'X-Powered-By': 'AWS Lambda',
    };
  }
});

/**
 * Main Lambda handler for the Quiz API
 * This function handles all HTTP requests through API Gateway
 */
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  // Set Lambda context to not wait for empty event loop
  context.callbackWaitsForEmptyEventLoop = false;
  
  try {
    logger.info('Lambda function invoked', {
      requestId: context.awsRequestId,
      httpMethod: event.httpMethod,
      path: event.path,
      userAgent: event.headers['User-Agent'],
      sourceIp: event.requestContext.identity.sourceIp,
    });
    
    // Handle the request through our Express app
    const result = await serverlessHandler(event, context) as APIGatewayProxyResult;
    
    logger.info('Lambda function completed successfully', {
      requestId: context.awsRequestId,
      statusCode: result.statusCode,
      responseSize: result.body?.length || 0,
    });
    
    return result;
    
  } catch (error) {
    logger.error('Lambda function error', error, {
      requestId: context.awsRequestId,
      httpMethod: event.httpMethod,
      path: event.path,
    });
    
    // Return a generic error response
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'X-Request-ID': context.awsRequestId,
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        requestId: context.awsRequestId,
        timestamp: new Date().toISOString(),
      }),
    };
  }
};

export default handler;
