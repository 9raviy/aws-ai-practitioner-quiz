import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
  QuizQuestion,
  QuizSession,
  QuizProgress,
  QuizResults,
  ApiResponse
} from '../types/quiz.types';

interface StartQuizRequest {
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  userId?: string;
  preferences?: {
    domains?: string[];
    timeLimit?: number;
  };
}

interface SubmitAnswerRequest {
  sessionId: string;
  questionId: string;
  selectedAnswer: number;
  timeSpent?: number;
}

class ApiService {
  private api: AxiosInstance;
  private baseURL: string;

  constructor() {
    // Use environment variable or default to local development
    this.baseURL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';
    
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for logging
    this.api.interceptors.request.use(
      (config: any) => {
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error: any) => {
        console.error('API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        console.log(`API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error: any) => {
        console.error('API Response Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  // Health check
  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    try {
      const response = await this.api.get('/api/v1/health');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Start a new quiz session
  async startQuiz(request: StartQuizRequest): Promise<ApiResponse<QuizSession>> {
    try {
      const response = await this.api.post('/api/v1/quiz/start', request);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get a specific question
  async getQuestion(sessionId: string): Promise<ApiResponse<QuizQuestion>> {
    try {
      const response = await this.api.get(`/api/v1/quiz/question/${sessionId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Submit an answer
  async submitAnswer(request: SubmitAnswerRequest): Promise<ApiResponse<{
    isCorrect: boolean;
    explanation: string;
    currentScore: number;
    nextQuestionNumber?: number;
  }>> {
    try {
      const response = await this.api.post('/api/v1/quiz/answer', request);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get quiz progress
  async getProgress(sessionId: string): Promise<ApiResponse<QuizProgress>> {
    try {
      const response = await this.api.get(`/api/v1/quiz/progress/${sessionId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get quiz results
  async getResults(sessionId: string): Promise<ApiResponse<QuizResults>> {
    try {
      const response = await this.api.get(`/api/v1/quiz/results/${sessionId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: any): Error {
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.error || error.response.data?.message || 'Server error';
      return new Error(`${error.response.status}: ${message}`);
    } else if (error.request) {
      // Request was made but no response received
      return new Error('Network error: Unable to connect to server');
    } else {
      // Something else happened
      return new Error(error.message || 'Unknown error occurred');
    }
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;
