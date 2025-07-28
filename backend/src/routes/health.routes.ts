import { Router, Request, Response, NextFunction } from "express";
import { BedrockService } from "../services/bedrock.service";
import { logger } from "../utils/logger";

const router = Router();

// CORS middleware for all health routes
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

/**
 * Health check endpoint
 * GET /api/v1/health
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const bedrockService = new BedrockService();
    
    // Test Bedrock connectivity
    const bedrockHealthy = await bedrockService.testConnection();
    
    const healthStatus = {
      status: bedrockHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      services: {
        bedrock: bedrockHealthy ? "connected" : "disconnected",
        database: "not_implemented", // Will be updated in Phase 3
      },
      environment: process.env.NODE_ENV || "development",
    };

    const statusCode = bedrockHealthy ? 200 : 503;
    
    res.status(statusCode).json({
      success: bedrockHealthy,
      data: healthStatus,
      timestamp: new Date().toISOString(),
    });

    logger.info("Health check completed", {
      requestId: req.requestId,
      status: healthStatus.status,
      bedrockHealthy,
    });

  } catch (error) {
    logger.error("Health check failed", error, {
      requestId: req.requestId,
    });

    res.status(503).json({
      success: false,
      error: {
        code: "HEALTH_CHECK_FAILED",
        message: "Health check failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Detailed health check endpoint
 * GET /api/v1/health/detailed
 */
router.get("/detailed", async (req: Request, res: Response) => {
  try {
    const bedrockService = new BedrockService();
    const startTime = Date.now();
    
    // Test Bedrock connectivity with timing
    const bedrockHealthy = await bedrockService.testConnection();
    const bedrockResponseTime = Date.now() - startTime;
    
    const detailedHealth = {
      status: bedrockHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      services: {
        bedrock: {
          status: bedrockHealthy ? "connected" : "disconnected",
          responseTime: `${bedrockResponseTime}ms`,
          model: "anthropic.claude-3-5-sonnet-20241022-v2:0",
          region: "us-west-2",
        },
        database: {
          status: "not_implemented",
          message: "DynamoDB integration pending Phase 3",
        },
      },
      environment: process.env.NODE_ENV || "development",
    };

    const statusCode = bedrockHealthy ? 200 : 503;
    
    res.status(statusCode).json({
      success: bedrockHealthy,
      data: detailedHealth,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error("Detailed health check failed", error, {
      requestId: req.requestId,
    });

    res.status(503).json({
      success: false,
      error: {
        code: "HEALTH_CHECK_FAILED",
        message: "Detailed health check failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
