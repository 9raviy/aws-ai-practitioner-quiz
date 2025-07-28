import { BedrockService } from "./bedrock.service";
import { SessionService } from "./session.service";
import { 
  QuizStartRequest,
  QuizStartResponse,
  SubmitAnswerRequest,
  SubmitAnswerResponse,
  QuizResults,
  QuizQuestion,
  UserAnswer,
  QuizDifficulty,
  BedrockRequest
} from "../types/quiz.types";
import { logger } from "../utils/logger";
import { QUIZ_CONFIG, AI_PRACTITIONER_DOMAINS } from "../utils/constants";

export class QuizService {
  constructor(
    private bedrockService: BedrockService,
    private sessionService: SessionService
  ) {}

  /**
   * Start a new quiz session
   */
  async startQuizSession(request: QuizStartRequest): Promise<QuizStartResponse> {
    try {
      // Create new session
      const session = await this.sessionService.createSession(
        request.difficulty || QuizDifficulty.BEGINNER,
        request.userId
      );

      // Generate first question
      const firstQuestion = await this.generateQuestion(session.difficulty, []);

      logger.info("Quiz session started", {
        sessionId: session.sessionId,
        difficulty: session.difficulty,
        totalQuestions: session.totalQuestions,
        firstQuestionId: firstQuestion.id,
      });

      return {
        sessionId: session.sessionId,
        totalQuestions: session.totalQuestions,
        timeLimit: QUIZ_CONFIG.TIME_LIMIT_MINUTES * 60, // Convert to seconds
        firstQuestion: {
          ...firstQuestion,
          questionNumber: 1,
        },
      };

    } catch (error) {
      logger.error("Failed to start quiz session", error);
      throw new Error(`Failed to start quiz session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get next question for session
   */
  async getNextQuestion(sessionId: string) {
    try {
      const session = await this.sessionService.getSession(sessionId);
      
      if (!session) {
        throw new Error("Session not found");
      }

      if (session.isCompleted) {
        throw new Error("Quiz already completed");
      }

      // Check if we've reached the question limit
      if (session.currentQuestionIndex >= session.totalQuestions) {
        throw new Error("All questions have been answered");
      }

      // Get adaptive difficulty
      const difficulty = this.sessionService.getAdaptiveDifficulty(session);
      
      // Get previously asked question IDs to avoid duplicates
      const excludeQuestionIds = session.answers.map(answer => answer.questionId);
      
      // Generate next question
      const question = await this.generateQuestion(difficulty, excludeQuestionIds);

      const progress = {
        currentQuestion: session.currentQuestionIndex + 1,
        totalQuestions: session.totalQuestions,
        correctAnswers: session.correctAnswers,
        score: session.score,
        timeRemaining: this.calculateTimeRemaining(session),
      };

      logger.info("Next question generated", {
        sessionId,
        questionId: question.id,
        difficulty: question.difficulty,
        questionNumber: session.currentQuestionIndex + 1,
      });

      return {
        question: {
          ...question,
          questionNumber: session.currentQuestionIndex + 1,
        },
        progress,
      };

    } catch (error) {
      logger.error("Failed to get next question", error, { sessionId });
      throw new Error(`Failed to get next question: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Submit answer and get feedback
   */
  async submitAnswer(request: SubmitAnswerRequest): Promise<SubmitAnswerResponse> {
    try {
      const session = await this.sessionService.getSession(request.sessionId);
      
      if (!session) {
        throw new Error("Session not found");
      }

      if (session.isCompleted) {
        throw new Error("Quiz already completed");
      }

      // First, we need to get the current question to validate the answer
      // For now, we'll generate it again (in Phase 3, we'll store questions)
      const difficulty = this.sessionService.getAdaptiveDifficulty(session);
      const excludeQuestionIds = session.answers.map(answer => answer.questionId);
      const currentQuestion = await this.generateQuestion(difficulty, excludeQuestionIds);

      // Validate answer
      const isCorrect = request.selectedAnswer === currentQuestion.correctAnswer;

      // Create user answer record
      const userAnswer: UserAnswer = {
        questionId: request.questionId,
        selectedAnswer: request.selectedAnswer,
        isCorrect,
        timeSpent: request.timeSpent || 0,
        timestamp: new Date(),
      };

      // Update session
      const updatedSession = await this.sessionService.updateSession(
        request.sessionId,
        userAnswer,
        currentQuestion
      );

      if (!updatedSession) {
        throw new Error("Failed to update session");
      }

      // Prepare response
      const response: SubmitAnswerResponse = {
        isCorrect,
        correctAnswer: currentQuestion.correctAnswer,
        explanation: currentQuestion.explanation,
        sessionProgress: {
          currentQuestionIndex: updatedSession.currentQuestionIndex,
          totalQuestions: updatedSession.totalQuestions,
          score: updatedSession.score,
          correctAnswers: updatedSession.correctAnswers,
        },
        isQuizCompleted: updatedSession.isCompleted,
      };

      // If quiz is not completed, get next question
      if (!updatedSession.isCompleted) {
        const nextDifficulty = this.sessionService.getAdaptiveDifficulty(updatedSession);
        const nextExcludeIds = updatedSession.answers.map(answer => answer.questionId);
        const nextQuestion = await this.generateQuestion(nextDifficulty, nextExcludeIds);
        
        response.nextQuestion = {
          ...nextQuestion,
          questionNumber: updatedSession.currentQuestionIndex + 1,
        };
      } else {
        // Quiz completed, include final results
        response.finalResults = await this.calculateFinalResults(updatedSession);
      }

      logger.info("Answer submitted", {
        sessionId: request.sessionId,
        questionId: request.questionId,
        isCorrect,
        isQuizCompleted: updatedSession.isCompleted,
        finalScore: updatedSession.score,
      });

      return response;

    } catch (error) {
      logger.error("Failed to submit answer", error, { 
        sessionId: request.sessionId,
        questionId: request.questionId,
      });
      throw new Error(`Failed to submit answer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get quiz results
   */
  async getQuizResults(sessionId: string): Promise<QuizResults> {
    try {
      const session = await this.sessionService.getSession(sessionId);
      
      if (!session) {
        throw new Error("Session not found");
      }

      if (!session.isCompleted) {
        throw new Error("Quiz not yet completed");
      }

      return this.calculateFinalResults(session);

    } catch (error) {
      logger.error("Failed to get quiz results", error, { sessionId });
      throw new Error(`Failed to get quiz results: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get quiz progress
   */
  async getQuizProgress(sessionId: string) {
    try {
      const session = await this.sessionService.getSession(sessionId);
      
      if (!session) {
        throw new Error("Session not found");
      }

      return {
        sessionId: session.sessionId,
        currentQuestion: session.currentQuestionIndex,
        totalQuestions: session.totalQuestions,
        correctAnswers: session.correctAnswers,
        score: session.score,
        timeRemaining: this.calculateTimeRemaining(session),
        isCompleted: session.isCompleted,
        answers: session.answers.map(answer => ({
          questionId: answer.questionId,
          isCorrect: answer.isCorrect,
          timeSpent: answer.timeSpent,
        })),
      };

    } catch (error) {
      logger.error("Failed to get quiz progress", error, { sessionId });
      throw new Error(`Failed to get quiz progress: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate a question using Bedrock
   */
  private async generateQuestion(
    difficulty: QuizDifficulty, 
    excludeQuestionIds: string[]
  ): Promise<QuizQuestion> {
    const bedrockRequest: BedrockRequest = {
      difficulty,
      excludeQuestionIds,
      topic: this.getRandomTopic(),
    };

    const response = await this.bedrockService.generateQuestion(bedrockRequest);
    return response.question;
  }

  /**
   * Calculate remaining time for session
   */
  private calculateTimeRemaining(session: any): number {
    const timeLimit = QUIZ_CONFIG.TIME_LIMIT_MINUTES * 60 * 1000; // Convert to milliseconds
    const elapsed = Date.now() - session.startTime.getTime();
    const remaining = Math.max(0, timeLimit - elapsed);
    return Math.floor(remaining / 1000); // Return in seconds
  }

  /**
   * Calculate final results
   */
  private async calculateFinalResults(session: any): Promise<QuizResults> {
    const totalTime = session.endTime 
      ? session.endTime.getTime() - session.startTime.getTime()
      : Date.now() - session.startTime.getTime();

    // Calculate domain breakdown (simplified for now)
    const domainBreakdown = Object.values(AI_PRACTITIONER_DOMAINS).reduce((acc, domain) => {
      acc[domain] = {
        correct: Math.floor(session.correctAnswers / 4), // Simplified distribution
        total: Math.floor(session.totalQuestions / 4),
      };
      return acc;
    }, {} as any);

    // Calculate difficulty breakdown (simplified for now)
    const difficultyBreakdown = {
      [QuizDifficulty.BEGINNER]: { 
        correct: Math.floor(session.correctAnswers * 0.4), 
        total: QUIZ_CONFIG.DIFFICULTY_PROGRESSION.BEGINNER_RANGE[1] 
      },
      [QuizDifficulty.INTERMEDIATE]: { 
        correct: Math.floor(session.correctAnswers * 0.4), 
        total: QUIZ_CONFIG.DIFFICULTY_PROGRESSION.INTERMEDIATE_RANGE[1] - 
               QUIZ_CONFIG.DIFFICULTY_PROGRESSION.INTERMEDIATE_RANGE[0] + 1
      },
      [QuizDifficulty.ADVANCED]: { 
        correct: Math.floor(session.correctAnswers * 0.2), 
        total: QUIZ_CONFIG.DIFFICULTY_PROGRESSION.ADVANCED_RANGE[1] - 
               QUIZ_CONFIG.DIFFICULTY_PROGRESSION.ADVANCED_RANGE[0] + 1
      },
    };

    return {
      sessionId: session.sessionId,
      totalQuestions: session.totalQuestions,
      correctAnswers: session.correctAnswers,
      score: session.score,
      timeSpent: Math.floor(totalTime / 1000), // Convert to seconds
      difficulty: session.difficulty,
      breakdown: domainBreakdown,
      difficultyBreakdown,
    };
  }

  /**
   * Get random topic for question generation
   */
  private getRandomTopic(): string {
    const topics = [
      "Amazon SageMaker",
      "Amazon Bedrock", 
      "Amazon Rekognition",
      "Amazon Textract",
      "Amazon Comprehend",
      "Amazon Polly",
      "Amazon Lex",
      "AWS DeepLens",
      "Machine Learning Fundamentals",
      "Responsible AI",
      "Model Training and Deployment",
      "Data Preparation",
    ];
    
    return topics[Math.floor(Math.random() * topics.length)];
  }
}
