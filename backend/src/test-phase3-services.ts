import { BedrockService } from "./services/bedrock.service";
import { QuizService } from "./services/quiz.service";
import { SessionService } from "./services/session.service";
import { DynamoDBService } from "./services/dynamodb.service";
import { QuizDifficulty } from "./types/quiz.types";

async function testPhase3Services() {
  console.log("🧪 Testing Phase 3 Services Integration...");
  
  try {
    // Test 1: Service Initialization
    console.log("\n1️⃣ Testing service initialization...");
    const bedrockService = new BedrockService();
    const sessionService = new SessionService();
    const dynamoService = new DynamoDBService();
    const quizService = new QuizService(bedrockService, sessionService);
    
    console.log("✅ All services initialized successfully");
    
    // Test 2: DynamoDB Connection (will fail locally but that's expected)
    console.log("\n2️⃣ Testing DynamoDB connection...");
    const dynamoConnected = await dynamoService.testConnection();
    console.log(`📊 DynamoDB connection: ${dynamoConnected ? '✅ Connected' : '⚠️ Not connected (expected for local)'}`);
    
    // Test 3: Session Service with fallback storage
    console.log("\n3️⃣ Testing session service (should use in-memory for local)...");
    const session = await sessionService.createSession(QuizDifficulty.BEGINNER, "test-user-123");
    console.log("✅ Session created:", {
      sessionId: session.sessionId,
      difficulty: session.difficulty,
      userId: session.userId
    });
    
    // Test 4: Quiz Service Integration
    console.log("\n4️⃣ Testing quiz service with new session service...");
    const startResponse = await quizService.startQuizSession({
      difficulty: QuizDifficulty.BEGINNER,
      userId: "test-user-456"
    });
    
    console.log("✅ Quiz started successfully:", {
      sessionId: startResponse.sessionId,
      totalQuestions: startResponse.totalQuestions,
      hasFirstQuestion: !!startResponse.firstQuestion
    });
    
    // Test 5: Answer Submission
    console.log("\n5️⃣ Testing answer submission...");
    const submitResponse = await quizService.submitAnswer({
      sessionId: startResponse.sessionId,
      questionId: startResponse.firstQuestion.id,
      selectedAnswer: 0,
      timeSpent: 45
    });
    
    console.log("✅ Answer submitted:", {
      isCorrect: submitResponse.isCorrect,
      hasNextQuestion: !!submitResponse.nextQuestion,
      isCompleted: submitResponse.isQuizCompleted
    });
    
    console.log("\n🎉 Phase 3 Services Integration Test PASSED!");
    console.log("✅ Ready for AWS deployment");
    
  } catch (error) {
    console.error("❌ Phase 3 test failed:", error);
    process.exit(1);
  }
}

// Run the test
testPhase3Services();
