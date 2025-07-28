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
      // Generate first question
      const firstQuestion = await this.generateQuestion(request.difficulty || QuizDifficulty.BEGINNER, []);

      // Create new session with the first question
      const session = await this.sessionService.createSession(
        request.difficulty || QuizDifficulty.BEGINNER,
        request.userId,
        firstQuestion
      );

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

      // Use the current question from the session if available
      let question = session.currentQuestion;
      
      if (!question) {
        // Fallback: generate a new question if not stored in session
        const difficulty = this.sessionService.getAdaptiveDifficulty(session);
        const excludeQuestionIds = session.answers.map(answer => answer.questionId);
        question = await this.generateQuestion(difficulty, excludeQuestionIds);
        
        // Update the session with the current question
        await this.sessionService.setCurrentQuestion(sessionId, question);
        
        logger.info("Session updated with new current question", {
          sessionId,
          questionId: question.id,
        });
      }

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
      logger.info("Submit answer - starting", { 
        sessionId: request.sessionId,
        questionId: request.questionId,
        selectedAnswer: request.selectedAnswer 
      });

      const session = await this.sessionService.getSession(request.sessionId);
      
      if (!session) {
        throw new Error("Session not found");
      }

      if (session.isCompleted) {
        throw new Error("Quiz already completed");
      }

      // Use the current question from the session for validation
      const currentQuestion = session.currentQuestion;
      
      if (!currentQuestion) {
        throw new Error("No current question found in session");
      }

      // Validate that the question ID matches
      if (currentQuestion.id !== request.questionId) {
        logger.error("Question ID mismatch", {
          expected: currentQuestion.id,
          received: request.questionId,
          sessionId: request.sessionId
        });
        throw new Error("Question ID mismatch");
      }

      // Validate answer
      const isCorrect = request.selectedAnswer === currentQuestion.correctAnswer;
      logger.info("Answer validation", { isCorrect, selectedAnswer: request.selectedAnswer, correctAnswer: currentQuestion.correctAnswer });

      // Create user answer record
      const userAnswer: UserAnswer = {
        questionId: request.questionId,
        selectedAnswer: request.selectedAnswer,
        isCorrect,
        timeSpent: request.timeSpent || 0,
        timestamp: new Date(),
      };

      // Generate next question if quiz is not completed
      let nextQuestion: QuizQuestion | undefined;
      if (session.currentQuestionIndex + 1 < session.totalQuestions) {
        try {
          logger.info("Generating next question", { 
            currentIndex: session.currentQuestionIndex,
            totalQuestions: session.totalQuestions 
          });
          
          const nextDifficulty = this.sessionService.getAdaptiveDifficulty({
            ...session,
            currentQuestionIndex: session.currentQuestionIndex + 1,
            answers: [...session.answers, userAnswer],
            correctAnswers: session.correctAnswers + (isCorrect ? 1 : 0),
          });
          
          const nextExcludeIds = [...session.answers.map(answer => answer.questionId), request.questionId];
          nextQuestion = await this.generateQuestion(nextDifficulty, nextExcludeIds);
          
          logger.info("Next question generated successfully", { nextDifficulty, nextQuestionId: nextQuestion?.id });
        } catch (questionError) {
          logger.error("Failed to generate next question", questionError);
          throw new Error(`Failed to generate next question: ${questionError instanceof Error ? questionError.message : 'Unknown error'}`);
        }
      } else {
        logger.info("Quiz will be completed after this answer");
      }

      // Update session with answer and next question
      logger.info("Updating session", { sessionId: request.sessionId });
      const updatedSession = await this.sessionService.updateSession(
        request.sessionId,
        userAnswer,
        currentQuestion,
        nextQuestion
      );

      if (!updatedSession) {
        throw new Error("Failed to update session");
      }

      logger.info("Session updated successfully", { 
        sessionId: request.sessionId,
        isCompleted: updatedSession.isCompleted,
        currentIndex: updatedSession.currentQuestionIndex
      });

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

      // If quiz is not completed, include next question from session
      if (!updatedSession.isCompleted && updatedSession.currentQuestion) {
        response.nextQuestion = {
          ...updatedSession.currentQuestion,
          questionNumber: updatedSession.currentQuestionIndex + 1,
        };
      } else if (updatedSession.isCompleted) {
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

      // Allow getting results even if quiz is not officially completed
      // This handles edge cases where frontend requests results early
      if (!session.isCompleted && session.currentQuestionIndex === 0) {
        throw new Error("Quiz has not started yet");
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

    const totalTimeSeconds = Math.floor(totalTime / 1000);
    const accuracy = session.totalQuestions > 0 ? (session.correctAnswers / session.totalQuestions) * 100 : 0;
    const averageTimePerQuestion = session.totalQuestions > 0 ? totalTimeSeconds / session.totalQuestions : 0;

    // Calculate domain breakdown (simplified for now)
    const topicBreakdown = Object.values(AI_PRACTITIONER_DOMAINS).reduce((acc, domain) => {
      const correct = Math.floor(session.correctAnswers / 4); // Simplified distribution
      const total = Math.floor(session.totalQuestions / 4);
      const domainAccuracy = total > 0 ? (correct / total) * 100 : 0;
      
      acc[domain] = {
        correct,
        total,
        accuracy: Number(domainAccuracy.toFixed(1)),
      };
      return acc;
    }, {} as any);

    // Generate feedback based on performance
    let feedback = "";
    if (accuracy >= 80) {
      feedback = "Excellent work! You demonstrate strong knowledge of AWS AI/ML services. Consider advancing to the next difficulty level.";
    } else if (accuracy >= 60) {
      feedback = "Good job! You have a solid foundation. Review the topics you missed to strengthen your understanding.";
    } else if (accuracy >= 40) {
      feedback = "You're on the right track! Focus on studying the key AWS AI/ML concepts and services to improve your score.";
    } else {
      feedback = "Keep learning! Review the AWS AI Practitioner fundamentals and practice more to build your knowledge.";
    }

    // Recommend next level
    let recommendedNextLevel: QuizDifficulty | undefined;
    if (session.difficulty === QuizDifficulty.BEGINNER && accuracy >= 75) {
      recommendedNextLevel = QuizDifficulty.INTERMEDIATE;
    } else if (session.difficulty === QuizDifficulty.INTERMEDIATE && accuracy >= 80) {
      recommendedNextLevel = QuizDifficulty.ADVANCED;
    }

    return {
      sessionId: session.sessionId,
      totalQuestions: session.totalQuestions,
      correctAnswers: session.correctAnswers,
      score: session.score,
      accuracy: Number(accuracy.toFixed(1)),
      totalTime: totalTimeSeconds,
      averageTimePerQuestion: Number(averageTimePerQuestion.toFixed(1)),
      difficulty: session.difficulty,
      topicBreakdown,
      recommendedNextLevel,
      feedback,
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
