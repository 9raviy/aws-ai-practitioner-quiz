import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

// Extend Request type to include request ID
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  // Generate unique request ID
  req.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const startTime = Date.now();
  const { method, originalUrl, ip } = req;
  const userAgent = req.get("User-Agent") || "Unknown";

  // Log incoming request
  logger.info("Incoming request", {
    requestId: req.requestId,
    method,
    url: originalUrl,
    ip,
    userAgent,
  });

  // Override res.json to log responses
  const originalJson = res.json;
  res.json = function(body: any) {
    const duration = Date.now() - startTime;
    const { statusCode } = res;
    
    // Log response
    logger.info("Request completed", {
      requestId: req.requestId,
      method,
      url: originalUrl,
      statusCode,
      duration: `${duration}ms`,
      success: body?.success || statusCode < 400,
    });

    return originalJson.call(this, body);
  };

  next();
};

export const validateJSON = (req: Request, res: Response, next: NextFunction): void => {
  if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
    if (req.is("application/json") && Object.keys(req.body).length === 0) {
      res.status(400).json({
        success: false,
        error: {
          code: "INVALID_JSON",
          message: "Request body must contain valid JSON",
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }
  }
  next();
};
