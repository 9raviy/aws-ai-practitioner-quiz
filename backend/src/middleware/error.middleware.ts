import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

export interface APIError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

export const errorHandler = (
  error: APIError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log the error
  logger.error("API Error occurred", error, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  // Default error response
  const statusCode = error.statusCode || 500;
  const errorCode = error.code || "INTERNAL_SERVER_ERROR";
  const message = error.message || "An unexpected error occurred";

  // Don't expose internal errors in production
  const isDevelopment = process.env.NODE_ENV !== "production";
  const errorDetails = isDevelopment ? error.stack : undefined;

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message,
      details: errorDetails || error.details,
    },
    timestamp: new Date().toISOString(),
  });
};

// Helper function to create API errors
export const createAPIError = (
  message: string,
  statusCode: number = 500,
  code?: string,
  details?: any
): APIError => {
  const error = new Error(message) as APIError;
  error.statusCode = statusCode;
  error.code = code;
  error.details = details;
  return error;
};
