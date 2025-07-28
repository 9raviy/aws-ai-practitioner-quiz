import express from "express";
import cors from "cors";
import helmet from "helmet";
import { logger } from "./utils/logger";

// Simple server test
const app = express();
const PORT = 3001;

// Basic middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Simple test route
app.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Phase 2 API server is working!",
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    phase: "Phase 2 - Backend API Development",
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Phase 2 Test Server running on http://localhost:${PORT}`);
  console.log(`✅ Test endpoint: http://localhost:${PORT}/test`);
  console.log(`✅ Health check: http://localhost:${PORT}/health`);
});

export default app;
