/**
 * Configuration and constants for the AWS AI Quiz Backend
 */

export const AWS_CONFIG = {
  REGION: process.env.BEDROCK_REGION || "us-west-2",
  BEDROCK_MODEL_ID: "anthropic.claude-3-5-sonnet-20241022-v2:0",
  MAX_TOKENS: 2000,
  TEMPERATURE: 0.7,
  TOP_P: 0.9,
} as const;

export const QUIZ_CONFIG = {
  TOTAL_QUESTIONS: 10,
  TIME_LIMIT_MINUTES: 30,
  PASSING_SCORE_PERCENTAGE: 70,
  DIFFICULTY_PROGRESSION: {
    // Questions 1-3: Beginner
    BEGINNER_RANGE: [1, 3],
    // Questions 4-7: Intermediate
    INTERMEDIATE_RANGE: [4, 7],
    // Questions 8-10: Advanced
    ADVANCED_RANGE: [8, 10],
  },
} as const;

export const AI_PRACTITIONER_DOMAINS = {
  FUNDAMENTALS: "Machine Learning Fundamentals",
  AI_SERVICES: "AI Services",
  RESPONSIBLE_AI: "Responsible AI",
  GENERATIVE_AI: "Generative AI",
} as const;

export const ERROR_CODES = {
  BEDROCK_CONNECTION_FAILED: "BEDROCK_CONNECTION_FAILED",
  INVALID_QUESTION_FORMAT: "INVALID_QUESTION_FORMAT",
  SESSION_NOT_FOUND: "SESSION_NOT_FOUND",
  INVALID_ANSWER: "INVALID_ANSWER",
  QUIZ_ALREADY_COMPLETED: "QUIZ_ALREADY_COMPLETED",
  AUTHENTICATION_FAILED: "AUTHENTICATION_FAILED",
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;
