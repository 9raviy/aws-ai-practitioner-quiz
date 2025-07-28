import express from "express";
import { BedrockService } from "./services/bedrock.service";
import { QuizService } from "./services/quiz.service";
import { SessionService } from "./services/session.service";
import { QuizDifficulty } from "./types/quiz.types";

async function testAPIEndpoints() {
  console.log("🧪 Testing Phase 2 API Endpoints...");
  
  try {
    // Initialize services
    const bedrockService = new BedrockService();
    const sessionService = new SessionService();
    const quizService = new QuizService(bedrockService, sessionService);
    
    console.log("✅ Services initialized successfully");
    
    // Test 1: Start Quiz Session
    console.log("\n🚀 Test 1: Starting quiz session...");
    const startResponse = await quizService.startQuizSession({
      difficulty: QuizDifficulty.BEGINNER,
      userId: "test-user-123"
    });
    
    console.log("✅ Quiz session started:", {
      sessionId: startResponse.sessionId,
      totalQuestions: startResponse.totalQuestions,
      firstQuestionPreview: startResponse.firstQuestion?.question?.substring(0, 80) + "..."
    });
    
    // Test 2: Get Session Status
    console.log("\n📊 Test 2: Getting session status...");
    const session = await sessionService.getSession(startResponse.sessionId);
    console.log("✅ Session status retrieved:", {
      sessionId: session?.sessionId,
      currentQuestionIndex: session?.currentQuestionIndex,
      isCompleted: session?.isCompleted
    });
    
    // Test 3: Submit Answer
    console.log("\n📝 Test 3: Submitting answer...");
    const submitResponse = await quizService.submitAnswer({
      sessionId: startResponse.sessionId,
      questionId: startResponse.firstQuestion.id,
      selectedAnswer: 0, // Pick first option
      timeSpent: 45
    });
    
    console.log("✅ Answer submitted:", {
      isCorrect: submitResponse.isCorrect,
      correctAnswer: submitResponse.correctAnswer,
      hasNextQuestion: !!submitResponse.nextQuestion,
      isQuizCompleted: submitResponse.isQuizCompleted
    });
    
    // Test 4: Get Progress
    console.log("\n📈 Test 4: Getting quiz progress...");
    const progress = await quizService.getQuizProgress(startResponse.sessionId);
    console.log("✅ Progress retrieved:", {
      currentQuestion: progress.currentQuestion,
      totalQuestions: progress.totalQuestions,
      score: progress.score
    });
    
    console.log("\n🎉 All Phase 2 API tests passed successfully!");
    console.log("✅ Backend API is ready for Phase 3 (AWS Infrastructure)");
    
  } catch (error) {
    console.error("❌ API test failed:", error);
    process.exit(1);
  }
}

// Run the test
testAPIEndpoints();
