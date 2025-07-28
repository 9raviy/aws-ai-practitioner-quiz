import { 
  QuizSession, 
  UserAnswer, 
  QuizDifficulty,
  QuizQuestion 
} from "../types/quiz.types";
import { logger } from "../utils/logger";
import { QUIZ_CONFIG } from "../utils/constants";

export class SessionService {
  private sessions: Map<string, QuizSession> = new Map();

  /**
   * Create a new quiz session
   */
  createSession(difficulty: QuizDifficulty, userId?: string): QuizSession {
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
    };

    this.sessions.set(sessionId, session);
    
    logger.info("New session created", {
      sessionId,
      difficulty,
      userId,
      totalQuestions: session.totalQuestions,
    });

    return session;
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<QuizSession | null> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      logger.warn("Session not found", { sessionId });
      return null;
    }

    return session;
  }

  /**
   * Update session with new answer
   */
  async updateSession(
    sessionId: string, 
    answer: UserAnswer, 
    currentQuestion: QuizQuestion
  ): Promise<QuizSession | null> {
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
    }

    this.sessions.set(sessionId, session);
    
    logger.info("Session updated", {
      sessionId,
      currentQuestionIndex: session.currentQuestionIndex,
      correctAnswers: session.correctAnswers,
      score: session.score,
      isCompleted: session.isCompleted,
    });

    return session;
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
   */
  cleanupExpiredSessions(): void {
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
  getSessionStats() {
    return {
      activeSessions: this.sessions.size,
      sessions: Array.from(this.sessions.values()).map(session => ({
        sessionId: session.sessionId,
        progress: `${session.currentQuestionIndex}/${session.totalQuestions}`,
        score: session.score,
        isCompleted: session.isCompleted,
        startTime: session.startTime,
      })),
    };
  }
}
