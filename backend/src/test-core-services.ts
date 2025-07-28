// Test just the core services without Express routing
console.log("🔍 Testing core services...");

async function testCoreServices() {
  try {
    console.log("1. Testing BedrockService...");
    const { BedrockService } = require('./services/bedrock.service');
    const bedrockService = new BedrockService();
    console.log("✅ BedrockService created successfully");

    console.log("2. Testing SessionService...");
    const { SessionService } = require('./services/session.service');
    const sessionService = new SessionService();
    console.log("✅ SessionService created successfully");

    console.log("3. Testing QuizService...");
    const { QuizService } = require('./services/quiz.service');
    const quizService = new QuizService(bedrockService, sessionService);
    console.log("✅ QuizService created successfully");

    console.log("4. Testing basic quiz functionality...");
    const session = await quizService.startQuizSession({
      difficulty: 'beginner',
      userId: 'test-user'
    });
    console.log("✅ Quiz session started:", session.sessionId);

    console.log("\n🎉 Core services test completed successfully!");
    console.log("The Lambda function should work correctly.");

  } catch (error) {
    console.error("❌ Core services test failed:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
    }
  }
}

testCoreServices();
