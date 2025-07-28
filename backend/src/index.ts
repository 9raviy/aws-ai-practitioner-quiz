import { BedrockService } from "./services/bedrock.service";
import { testBedrockConnection } from "./test-bedrock";

/**
 * Main entry point for the AWS AI Quiz Backend
 */
console.log("🚀 AWS AI Practitioner Quiz Backend Starting...");

// For now, we'll just export our services and run a basic test
export { BedrockService };

// Run test if in development mode
if (process.env.NODE_ENV !== "production") {
  console.log("🧪 Running in development mode - testing Bedrock connection...");
  testBedrockConnection().catch(console.error);
}
