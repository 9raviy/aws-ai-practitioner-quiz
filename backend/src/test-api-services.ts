import { BedrockService } from "./services/bedrock.service";
import { QuizService } from "./services/quiz.service";
import { SessionService } from "./services/session.service";
import { QuizDifficulty } from "./types/quiz.types";

async function testAPIServices() {
  console.log("🧪 Testing API Services...");
  
  try {
    // Initialize services
    const bedrockService = new BedrockService();
    const sessionService = new SessionService();
    const quizService = new QuizService(bedrockService, sessionService);
    
    console.log("✅ Services initialized successfully");
    
    // Test quiz start
    console.log("\n🚀 Testing quiz start...");
    const startResponse = await quizService.startQuizSession({
      difficulty: QuizDifficulty.BEGINNER,
      userId: "test-user-123"
    });
    
    console.log("✅ Quiz started successfully:", {
      sessionId: startResponse.sessionId,
      totalQuestions: startResponse.totalQuestions,
      firstQuestion: startResponse.firstQuestion?.question?.substring(0, 100) + "..."
    });
    
    // Test answer submission
    console.log("\n📝 Testing answer submission...");
    const submitResponse = await quizService.submitAnswer({
      sessionId: startResponse.sessionId,
      questionId: startResponse.firstQuestion.id,
      selectedAnswer: 0, // Just pick first option for testing
      timeSpent: 30
    });
    
    console.log("✅ Answer submitted successfully:", {
      isCorrect: submitResponse.isCorrect,
      isQuizCompleted: submitResponse.isQuizCompleted,
      hasNextQuestion: !!submitResponse.nextQuestion
    });
    
    console.log("\n🎉 All API service tests passed!");
    
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

// Run the test
testAPIServices();
