import { apiService } from '../services/api.service';

/**
 * Simple frontend testing utilities
 */

// Mock API service for development when backend is not available
export const createMockApiService = () => {
  const mockQuestions = [
    {
      id: 'q1',
      question: 'What is AWS Bedrock primarily used for?',
      options: [
        'Database management',
        'Foundation models and generative AI',
        'Network security',
        'Container orchestration'
      ],
      explanation: 'AWS Bedrock is a fully managed service that provides access to foundation models from leading AI companies through an API.',
      difficulty: 'beginner' as const,
      topic: 'AWS Bedrock Basics'
    },
    {
      id: 'q2',
      question: 'Which of the following is a key benefit of using Amazon SageMaker?',
      options: [
        'Automatic code deployment',
        'End-to-end machine learning workflow',
        'Database optimization',
        'Network load balancing'
      ],
      explanation: 'Amazon SageMaker provides a complete platform for building, training, and deploying machine learning models at scale.',
      difficulty: 'intermediate' as const,
      topic: 'Amazon SageMaker'
    }
  ];

  return {
    healthCheck: async () => ({ 
      success: true, 
      data: { status: 'ok', timestamp: new Date().toISOString() } 
    }),
    
    startQuiz: async (request: any) => ({
      success: true,
      data: {
        sessionId: `mock_session_${Date.now()}`,
        currentQuestionNumber: 1,
        totalQuestions: 10,
        score: 0,
        difficulty: request.difficulty,
        answers: [],
        startTime: new Date(),
        isCompleted: false
      }
    }),
    
    getQuestion: async (request: any) => ({
      success: true,
      data: mockQuestions[0] // Always return first question for demo
    }),
    
    submitAnswer: async (request: any) => ({
      success: true,
      data: {
        isCorrect: request.selectedOption === 1, // Option 1 is always correct in mock
        explanation: mockQuestions[0].explanation,
        currentScore: request.selectedOption === 1 ? 100 : 0,
        nextQuestionNumber: 2
      }
    }),
    
    getProgress: async (sessionId: string) => ({
      success: true,
      data: {
        sessionId,
        currentQuestion: 1,
        totalQuestions: 10,
        score: 50,
        accuracy: 50,
        averageTimePerQuestion: 30,
        difficulty: 'beginner' as const,
        topicsProgress: {
          'AWS Bedrock Basics': { correct: 1, total: 2 },
          'Amazon SageMaker': { correct: 0, total: 1 }
        }
      }
    }),
    
    getResults: async (sessionId: string) => ({
      success: true,
      data: {
        sessionId,
        totalQuestions: 10,
        correctAnswers: 7,
        score: 70,
        accuracy: 70,
        totalTime: 300,
        averageTimePerQuestion: 30,
        difficulty: 'beginner' as const,
        topicBreakdown: {
          'AWS Bedrock Basics': { correct: 3, total: 4, accuracy: 75 },
          'Amazon SageMaker': { correct: 2, total: 3, accuracy: 67 },
          'AI/ML Concepts': { correct: 2, total: 3, accuracy: 67 }
        },
        recommendedNextLevel: 'intermediate' as const,
        feedback: 'Great job! You have a solid understanding of AWS AI services. Consider trying the intermediate level to challenge yourself further.'
      }
    })
  };
};

// Test connectivity to backend
export const testBackendConnection = async (): Promise<boolean> => {
  try {
    await apiService.healthCheck();
    console.log('✅ Backend connection successful');
    return true;
  } catch (error) {
    console.warn('⚠️ Backend connection failed:', error);
    return false;
  }
};

// Environment check
export const checkEnvironment = () => {
  const env = {
    nodeEnv: process.env.NODE_ENV,
    apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:3001',
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
  };
  
  console.log('Environment configuration:', env);
  return env;
};

// Component testing helper
export const testComponent = (componentName: string) => {
  console.log(`Testing ${componentName} component...`);
  // This would be expanded with actual test logic
  return true;
};
