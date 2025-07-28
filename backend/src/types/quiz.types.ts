// Types for the AWS AI Practitioner Quiz Application

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number; // Index of correct option (0-3)
  explanation: string;
  difficulty: QuizDifficulty;
  topic: string;
  aiPractitionerDomain: string;
  questionNumber?: number; // Position of the question in the quiz (1-based)
}

export enum QuizDifficulty {
  BEGINNER = "beginner",
  INTERMEDIATE = "intermediate",
  ADVANCED = "advanced",
}

export interface QuizSession {
  sessionId: string;
  currentQuestionIndex: number;
  totalQuestions: number;
  score: number;
  correctAnswers: number;
  answers: UserAnswer[];
  difficulty: QuizDifficulty;
  startTime: Date;
  endTime?: Date;
  isCompleted: boolean;
}

export interface UserAnswer {
  questionId: string;
  selectedAnswer: number;
  isCorrect: boolean;
  timeSpent: number; // in seconds
  timestamp: Date;
}

export interface BedrockRequest {
  difficulty: QuizDifficulty;
  previousAnswers?: UserAnswer[];
  topic?: string;
  excludeQuestionIds?: string[];
}

export interface BedrockResponse {
  question: QuizQuestion;
  confidence: number;
  generationTime: number;
}

export interface QuizStartRequest {
  difficulty?: QuizDifficulty;
  userId?: string;
  preferences?: {
    domains?: string[];
    timeLimit?: number;
  };
}

export interface QuizStartResponse {
  sessionId: string;
  totalQuestions: number;
  timeLimit: number;
  firstQuestion: QuizQuestion & {
    questionNumber: number;
  };
}

export interface SubmitAnswerRequest {
  sessionId: string;
  questionId: string;
  selectedAnswer: number;
  timeSpent?: number; // Time spent on the question in seconds
}

export interface SubmitAnswerResponse {
  isCorrect: boolean;
  correctAnswer: number;
  explanation: string;
  nextQuestion?: QuizQuestion;
  sessionProgress: {
    currentQuestionIndex: number;
    totalQuestions: number;
    score: number;
    correctAnswers: number;
  };
  isQuizCompleted: boolean;
  finalResults?: QuizResults;
}

export interface QuizResults {
  sessionId: string;
  totalQuestions: number;
  correctAnswers: number;
  score: number; // percentage
  timeSpent: number; // total time in seconds
  difficulty: QuizDifficulty;
  breakdown: {
    [domain: string]: {
      correct: number;
      total: number;
    };
  };
  difficultyBreakdown?: {
    [key in QuizDifficulty]: {
      correct: number;
      total: number;
    };
  };
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  timestamp: string;
}
