// Lambda handlers export
export { handler as apiHandler } from './handlers/api.handler';
export { healthHandler } from './handlers/health.handler';

// Express app export (for local development)
export { default as app } from './app';

// Services export
export { BedrockService } from "./services/bedrock.service";
export { QuizService } from "./services/quiz.service";
export { SessionService } from "./services/session.service";
