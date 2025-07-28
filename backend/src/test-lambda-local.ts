import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { handler as apiHandler } from './handlers/api.handler';
import { healthHandler } from './handlers/health.handler';
import { logger } from './utils/logger';

// Mock API Gateway event
const createMockEvent = (httpMethod: string, path: string, body?: any): APIGatewayProxyEvent => ({
  httpMethod,
  path,
  pathParameters: null,
  queryStringParameters: null,
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'local-test/1.0',
  },
  multiValueHeaders: {},
  body: body ? JSON.stringify(body) : null,
  isBase64Encoded: false,
  requestContext: {
    accountId: '123456789012',
    apiId: 'test-api',
    httpMethod,
    path,
    stage: 'test',
    requestId: 'test-request-id',
    requestTimeEpoch: Date.now(),
    resourceId: 'test-resource',
    resourcePath: path,
    identity: {
      sourceIp: '127.0.0.1',
      userAgent: 'local-test/1.0',
      accessKey: null,
      accountId: null,
      apiKey: null,
      apiKeyId: null,
      caller: null,
      cognitoAuthenticationProvider: null,
      cognitoAuthenticationType: null,
      cognitoIdentityId: null,
      cognitoIdentityPoolId: null,
      principalOrgId: null,
      user: null,
      userArn: null,
      clientCert: {
        clientCertPem: '',
        issuerDN: '',
        serialNumber: '',
        subjectDN: '',
        validity: {
          notAfter: '',
          notBefore: '',
        },
      },
    },
    authorizer: null,
    protocol: 'HTTP/1.1',
    requestTime: new Date().toISOString(),
  },
  resource: path,
  stageVariables: null,
  multiValueQueryStringParameters: null,
});

// Mock Lambda context
const createMockContext = (): Context => ({
  callbackWaitsForEmptyEventLoop: false,
  functionName: 'test-function',
  functionVersion: '1',
  invokedFunctionArn: 'arn:aws:lambda:us-west-2:123456789012:function:test-function',
  memoryLimitInMB: '512',
  awsRequestId: 'test-request-' + Date.now(),
  logGroupName: '/aws/lambda/test-function',
  logStreamName: '2025/07/27/[$LATEST]test',
  getRemainingTimeInMillis: () => 30000,
  done: () => {},
  fail: () => {},
  succeed: () => {},
});

async function testLocalLambda() {
  console.log('🧪 Testing Lambda Handlers Locally...\n');
  
  try {
    // Test 1: Health Check
    console.log('🏥 Testing Health Check Handler...');
    const healthEvent = createMockEvent('GET', '/health');
    const healthContext = createMockContext();
    
    const healthResult = await healthHandler(healthEvent, healthContext);
    console.log('✅ Health Check Result:', {
      statusCode: healthResult.statusCode,
      headers: healthResult.headers,
      body: JSON.parse(healthResult.body),
    });
    
    // Test 2: Quiz Start
    console.log('\n🚀 Testing Quiz Start API...');
    const startEvent = createMockEvent('POST', '/api/v1/quiz/start', {
      difficulty: 'beginner',
      userId: 'test-user-123'
    });
    const startContext = createMockContext();
    
    const startResult = await apiHandler(startEvent, startContext);
    console.log('✅ Quiz Start Result:', {
      statusCode: startResult.statusCode,
      headers: startResult.headers,
      body: JSON.parse(startResult.body),
    });
    
    // Test 3: Invalid Route
    console.log('\n❌ Testing Invalid Route...');
    const invalidEvent = createMockEvent('GET', '/invalid/route');
    const invalidContext = createMockContext();
    
    const invalidResult = await apiHandler(invalidEvent, invalidContext);
    console.log('✅ Invalid Route Result:', {
      statusCode: invalidResult.statusCode,
      body: JSON.parse(invalidResult.body),
    });
    
    console.log('\n🎉 All local Lambda tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Local Lambda test failed:', error);
    process.exit(1);
  }
}

// Set up environment for local testing
process.env.NODE_ENV = 'development';
process.env.AWS_REGION = 'us-west-2';

// Run the tests
testLocalLambda();
