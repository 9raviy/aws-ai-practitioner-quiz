import { Router, Request, Response, NextFunction } from "express";
import { BedrockService } from "../services/bedrock.service";
import { QuizService } from "../services/quiz.service";
import { SessionService } from "../services/session.service";
import { logger } from "../utils/logger";
import { createAPIError } from "../middleware/error.middleware";
import {
  QuizStartRequest,
  QuizStartResponse,
  SubmitAnswerRequest,
  SubmitAnswerResponse,
  QuizDifficulty,
} from "../types/quiz.types";

const router = Router();

// CORS middleware for all quiz routes
router.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
});

// Initialize services
const bedrockService = new BedrockService();
const sessionService = new SessionService();
const quizService = new QuizService(bedrockService, sessionService);

/**
 * Start a new quiz session
 * POST /api/v1/quiz/start
 */
router.post(
  "/start",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { difficulty, userId, preferences }: QuizStartRequest = req.body;

      logger.info("Starting new quiz session", {
        requestId: req.requestId,
        difficulty,
        userId,
        preferences,
      });

      // Validate difficulty if provided
      if (difficulty && !Object.values(QuizDifficulty).includes(difficulty)) {
        throw createAPIError(
          "Invalid difficulty level. Must be 'beginner', 'intermediate', or 'advanced'",
          400,
          "INVALID_DIFFICULTY"
        );
      }

      const result = await quizService.startQuizSession({
        difficulty: difficulty || QuizDifficulty.BEGINNER,
        userId,
        preferences,
      });

      res.status(201).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get current session status
 * GET /api/v1/quiz/session/:sessionId
 */
router.get(
  "/session/:sessionId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;

      logger.info("Getting session status", {
        requestId: req.requestId,
        sessionId,
      });

      const session = await sessionService.getSession(sessionId);

      if (!session) {
        throw createAPIError(
          "Quiz session not found",
          404,
          "SESSION_NOT_FOUND"
        );
      }

      res.json({
        success: true,
        data: {
          sessionId: session.sessionId,
          currentQuestionIndex: session.currentQuestionIndex,
          totalQuestions: session.totalQuestions,
          score: session.score,
          correctAnswers: session.correctAnswers,
          isCompleted: session.isCompleted,
          startTime: session.startTime,
          endTime: session.endTime,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get next question
 * GET /api/v1/quiz/question/:sessionId
 */
router.get(
  "/question/:sessionId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;

      logger.info("Getting next question", {
        requestId: req.requestId,
        sessionId,
      });

      const result = await quizService.getNextQuestion(sessionId);

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Submit answer
 * POST /api/v1/quiz/answer
 */
router.post(
  "/answer",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        sessionId,
        questionId,
        selectedAnswer,
        timeSpent,
      }: SubmitAnswerRequest = req.body;

      logger.info("Submitting answer", {
        requestId: req.requestId,
        sessionId,
        questionId,
        selectedAnswer,
        timeSpent,
      });

      // Validate required fields
      if (!sessionId || !questionId || typeof selectedAnswer !== "number") {
        throw createAPIError(
          "Missing required fields: sessionId, questionId, selectedAnswer",
          400,
          "INVALID_REQUEST"
        );
      }

      // Validate answer range
      if (selectedAnswer < 0 || selectedAnswer > 3) {
        throw createAPIError(
          "Invalid answer selection. Must be between 0 and 3",
          400,
          "INVALID_ANSWER"
        );
      }

      const result = await quizService.submitAnswer({
        sessionId,
        questionId,
        selectedAnswer,
        timeSpent: timeSpent || 0,
      });

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get quiz results
 * GET /api/v1/quiz/results/:sessionId
 */
router.get(
  "/results/:sessionId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;

      logger.info("Getting quiz results", {
        requestId: req.requestId,
        sessionId,
      });

      const results = await quizService.getQuizResults(sessionId);

      res.json({
        success: true,
        data: results,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get quiz progress
 * GET /api/v1/quiz/progress/:sessionId
 */
router.get(
  "/progress/:sessionId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;

      logger.info("Getting quiz progress", {
        requestId: req.requestId,
        sessionId,
      });

      const progress = await quizService.getQuizProgress(sessionId);

      res.json({
        success: true,
        data: progress,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
