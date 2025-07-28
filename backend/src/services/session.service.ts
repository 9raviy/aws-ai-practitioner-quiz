import { 
  QuizSession, 
  UserAnswer, 
  QuizDifficulty,
  QuizQuestion 
} from "../types/quiz.types";
import { logger } from "../utils/logger";
import { QUIZ_CONFIG } from "../utils/constants";
import { DynamoDBService } from "./dynamodb.service";

export class SessionService {
  private dynamoDB: DynamoDBService;
  private useInMemory: boolean;
  private sessions: Map<string, QuizSession> = new Map(); // Fallback for local development

  constructor() {
    this.dynamoDB = new DynamoDBService();
    // Use in-memory storage for local development, DynamoDB for production
    this.useInMemory = process.env.NODE_ENV === 'development' || !process.env.DYNAMODB_TABLE_NAME;
    
    if (this.useInMemory) {
      logger.warn("Using in-memory session storage - not suitable for production");
    }
  }

  /**
   * Create a new quiz session
   */
  async createSession(difficulty: QuizDifficulty, userId?: string, firstQuestion?: QuizQuestion): Promise<QuizSession> {
    const sessionId = this.generateSessionId();
    
    const session: QuizSession = {
      sessionId,
      currentQuestionIndex: 0,
      totalQuestions: QUIZ_CONFIG.TOTAL_QUESTIONS,
      score: 0,
      correctAnswers: 0,
      answers: [],
      difficulty,
      startTime: new Date(),
      isCompleted: false,
      userId,
      currentQuestion: firstQuestion,
    };

    if (this.useInMemory) {
      this.sessions.set(sessionId, session);
    } else {
      await this.dynamoDB.createSession(session);
    }
    
    logger.info("New session created", {
      sessionId,
      difficulty,
      userId,
      totalQuestions: session.totalQuestions,
      storage: this.useInMemory ? 'memory' : 'dynamodb',
    });

    return session;
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<QuizSession | null> {
    let session: QuizSession | null = null;
    
    if (this.useInMemory) {
      session = this.sessions.get(sessionId) || null;
      if (!session) {
        logger.warn("Session not found in memory", { sessionId });
      }
    } else {
      session = await this.dynamoDB.getSession(sessionId);
    }
    
    return session;
  }

  /**
   * Update session with new answer and next question
   */
  async updateSession(
    sessionId: string, 
    answer: UserAnswer, 
    currentQuestion: QuizQuestion,
    nextQuestion?: QuizQuestion
  ): Promise<QuizSession | null> {
    if (this.useInMemory) {
      return this.updateSessionInMemory(sessionId, answer, currentQuestion, nextQuestion);
    } else {
      // DynamoDB implementation
      return this.dynamoDB.updateSession(sessionId, answer, currentQuestion, nextQuestion);
    }
  }

  /**
   * In-memory session update (for local development)
   */
  private updateSessionInMemory(
    sessionId: string, 
    answer: UserAnswer, 
    currentQuestion: QuizQuestion,
    nextQuestion?: QuizQuestion
  ): QuizSession | null {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      logger.warn("Cannot update session - session not found", { sessionId });
      return null;
    }

    // Add the answer
    session.answers.push(answer);
    
    // Update score
    if (answer.isCorrect) {
      session.correctAnswers++;
    }
    
    // Update progress
    session.currentQuestionIndex++;
    
    // Calculate current score percentage
    session.score = Math.round((session.correctAnswers / session.currentQuestionIndex) * 100);
    
    // Check if quiz is completed
    if (session.currentQuestionIndex >= session.totalQuestions) {
      session.isCompleted = true;
      session.endTime = new Date();
      session.currentQuestion = undefined; // Clear current question
    } else {
      // Set the next question for the session
      session.currentQuestion = nextQuestion;
    }

    this.sessions.set(sessionId, session);
    
    logger.info("Session updated in memory", {
      sessionId,
      currentQuestionIndex: session.currentQuestionIndex,
      correctAnswers: session.correctAnswers,
      score: session.score,
      isCompleted: session.isCompleted,
    });

    return session;
  }

  /**
   * Update the current question in a session
   */
  async setCurrentQuestion(sessionId: string, question: QuizQuestion): Promise<void> {
    if (this.useInMemory) {
      const session = this.sessions.get(sessionId);
      if (session) {
        session.currentQuestion = question;
        logger.info("Current question updated in session", { 
          sessionId, 
          questionId: question.id 
        });
      } else {
        logger.warn("Cannot set current question - session not found", { sessionId });
      }
    } else {
      // DynamoDB implementation
      try {
        await this.dynamoDB.setCurrentQuestion(sessionId, question);
        logger.info("Current question updated in DynamoDB", { 
          sessionId, 
          questionId: question.id 
        });
      } catch (error) {
        logger.error("Failed to set current question in DynamoDB", { 
          sessionId, 
          questionId: question.id, 
          error 
        });
        throw error;
      }
    }
  }

  /**
   * Get adaptive difficulty for next question
   */
  getAdaptiveDifficulty(session: QuizSession): QuizDifficulty {
    const { currentQuestionIndex, correctAnswers } = session;
    
    // If no answers yet, use session default
    if (currentQuestionIndex === 0) {
      return session.difficulty;
    }

    const correctPercentage = (correctAnswers / currentQuestionIndex) * 100;
    const questionNumber = currentQuestionIndex + 1; // Next question number
    
    // Use predefined ranges from QUIZ_CONFIG
    const { BEGINNER_RANGE, INTERMEDIATE_RANGE, ADVANCED_RANGE } = QUIZ_CONFIG.DIFFICULTY_PROGRESSION;
    
    // Determine base difficulty by question number
    let baseDifficulty: QuizDifficulty;
    if (questionNumber >= BEGINNER_RANGE[0] && questionNumber <= BEGINNER_RANGE[1]) {
      baseDifficulty = QuizDifficulty.BEGINNER;
    } else if (questionNumber >= INTERMEDIATE_RANGE[0] && questionNumber <= INTERMEDIATE_RANGE[1]) {
      baseDifficulty = QuizDifficulty.INTERMEDIATE;
    } else {
      baseDifficulty = QuizDifficulty.ADVANCED;
    }
    
    // Adjust based on performance
    if (correctPercentage >= 80) {
      // Performing well, can handle harder questions
      if (baseDifficulty === QuizDifficulty.BEGINNER) {
        return QuizDifficulty.INTERMEDIATE;
      }
      if (baseDifficulty === QuizDifficulty.INTERMEDIATE) {
        return QuizDifficulty.ADVANCED;
      }
      return QuizDifficulty.ADVANCED;
    } else if (correctPercentage >= 60) {
      // Average performance, stick to base difficulty
      return baseDifficulty;
    } else {
      // Struggling, use easier questions
      if (baseDifficulty === QuizDifficulty.ADVANCED) {
        return QuizDifficulty.INTERMEDIATE;
      }
      if (baseDifficulty === QuizDifficulty.INTERMEDIATE) {
        return QuizDifficulty.BEGINNER;
      }
      return QuizDifficulty.BEGINNER;
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up expired sessions (for memory management)
   * Only applies to in-memory storage - DynamoDB uses TTL
   */
  cleanupExpiredSessions(): void {
    if (!this.useInMemory) {
      return; // DynamoDB handles TTL automatically
    }
    
    const now = new Date();
    const expiredSessions: string[] = [];
    
    this.sessions.forEach((session, sessionId) => {
      const sessionAge = now.getTime() - session.startTime.getTime();
      const maxAge = QUIZ_CONFIG.TIME_LIMIT_MINUTES * 60 * 1000 * 2; // 2x time limit
      
      if (sessionAge > maxAge) {
        expiredSessions.push(sessionId);
      }
    });
    
    expiredSessions.forEach(sessionId => {
      this.sessions.delete(sessionId);
      logger.info("Expired session cleaned up", { sessionId });
    });
    
    if (expiredSessions.length > 0) {
      logger.info("Session cleanup completed", { 
        cleanedSessions: expiredSessions.length,
        activeSessions: this.sessions.size 
      });
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStats() {
    if (this.useInMemory) {
      return {
        activeSessions: this.sessions.size,
        storage: 'memory',
        sessions: Array.from(this.sessions.values()).map(session => ({
          sessionId: session.sessionId,
          progress: `${session.currentQuestionIndex}/${session.totalQuestions}`,
          score: session.score,
          isCompleted: session.isCompleted,
          startTime: session.startTime,
        })),
      };
    } else {
      const stats = await this.dynamoDB.getSessionStats();
      return {
        ...stats,
        storage: 'dynamodb',
      };
    }
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    if (this.useInMemory) {
      this.sessions.delete(sessionId);
      logger.info("Session deleted from memory", { sessionId });
    } else {
      await this.dynamoDB.deleteSession(sessionId);
    }
  }
}
