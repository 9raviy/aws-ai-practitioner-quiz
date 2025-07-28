// Environment configuration
export const config = {
  // API Configuration
  API_URL: process.env.REACT_APP_API_URL || 'http://localhost:3001',
  API_TIMEOUT: 30000,
  
  // Quiz Configuration
  DEFAULT_TOTAL_QUESTIONS: 10,
  DEFAULT_DIFFICULTY: 'beginner' as const,
  
  // Timer Configuration
  QUESTION_TIME_WARNING: 300, // 5 minutes
  
  // UI Configuration
  DEBOUNCE_DELAY: 300,
  ANIMATION_DURATION: 200,
  
  // Development flags
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  
  // Feature flags
  features: {
    showTimer: true,
    showProgress: true,
    showFeedback: true,
    adaptiveDifficulty: true,
  }
};

export default config;
