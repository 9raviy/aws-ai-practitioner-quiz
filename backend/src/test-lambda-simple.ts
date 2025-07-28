import { handler } from './handlers/api.handler';
import { healthHandler } from './handlers/health.handler';

async function testLambdaHandlers() {
  console.log("🧪 Testing Lambda handlers locally...");
  
  try {
    // Test event for health check
    const healthEvent = {
      httpMethod: 'GET',
      path: '/health',
      headers: {},
      requestContext: {
        requestId: 'test-request-id',
        identity: { sourceIp: '127.0.0.1' }
      },
      body: null,
      isBase64Encoded: false
    } as any;

    const healthContext = {
      awsRequestId: 'test-request-id',
      callbackWaitsForEmptyEventLoop: false,
      getRemainingTimeInMillis: () => 30000
    } as any;

    console.log("\n📋 Testing health handler...");
    const healthResult = await healthHandler(healthEvent, healthContext);
    console.log("✅ Health handler result:", {
      statusCode: healthResult.statusCode,
      hasBody: !!healthResult.body
    });

    // Test event for API handler
    const apiEvent = {
      httpMethod: 'GET',
      path: '/api/v1/health',
      headers: {},
      requestContext: {
        requestId: 'test-api-request-id',
        identity: { sourceIp: '127.0.0.1' }
      },
      body: null,
      isBase64Encoded: false
    } as any;

    const apiContext = {
      awsRequestId: 'test-api-request-id',
      callbackWaitsForEmptyEventLoop: false,
      getRemainingTimeInMillis: () => 30000
    } as any;

    console.log("\n🚀 Testing API handler...");
    const apiResult = await handler(apiEvent, apiContext);
    console.log("✅ API handler result:", {
      statusCode: apiResult.statusCode,
      hasBody: !!apiResult.body
    });

    console.log("\n🎉 Lambda handlers test completed successfully!");

  } catch (error) {
    console.error("❌ Lambda handler test failed:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
      console.error("Stack trace:", error.stack);
    }
    process.exit(1);
  }
}

// Run the test
testLambdaHandlers();
