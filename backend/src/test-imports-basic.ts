// Simple test to check basic imports and compilation
console.log("🔍 Testing basic imports...");

try {
  console.log("1. Testing BedrockService import...");
  const { BedrockService } = require('./services/bedrock.service');
  console.log("✅ BedrockService imported successfully");

  console.log("2. Testing SessionService import...");
  const { SessionService } = require('./services/session.service');
  console.log("✅ SessionService imported successfully");

  console.log("3. Testing QuizService import...");
  const { QuizService } = require('./services/quiz.service');
  console.log("✅ QuizService imported successfully");

  console.log("4. Testing app import...");
  const app = require('./app');
  console.log("✅ App imported successfully");

  console.log("5. Testing handler imports...");
  const { handler } = require('./handlers/api.handler');
  const { healthHandler } = require('./handlers/health.handler');
  console.log("✅ Handlers imported successfully");

  console.log("\n🎉 All imports successful! Lambda should work.");

} catch (error) {
  console.error("❌ Import failed:", error);
  if (error instanceof Error) {
    console.error("Error message:", error.message);
    console.error("Stack trace:", error.stack);
  }
}
