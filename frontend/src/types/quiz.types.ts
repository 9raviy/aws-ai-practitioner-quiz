// Quiz Types - Frontend interface definitions
export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  explanation?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  topic: string;
}

export interface QuizAnswer {
  questionId: string;
  selectedOption: number;
  isCorrect: boolean;
  timeSpent: number;
}

export interface QuizSession {
  sessionId: string;
  currentQuestionNumber: number;
  totalQuestions: number;
  score: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  answers: QuizAnswer[];
  startTime: Date;
  isCompleted: boolean;
}

export interface QuizProgress {
  sessionId: string;
  currentQuestion: number;
  totalQuestions: number;
  score: number;
  accuracy: number;
  averageTimePerQuestion: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  topicsProgress: Record<string, {
    correct: number;
    total: number;
  }>;
}

export interface QuizResults {
  sessionId: string;
  totalQuestions: number;
  correctAnswers: number;
  score: number;
  accuracy: number;
  totalTime: number;
  averageTimePerQuestion: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  topicBreakdown: Record<string, {
    correct: number;
    total: number;
    accuracy: number;
  }>;
  recommendedNextLevel?: 'beginner' | 'intermediate' | 'advanced';
  feedback: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// UI State Types
export interface LoadingState {
  isLoading: boolean;
  message?: string;
}

export interface ErrorState {
  hasError: boolean;
  message: string;
  code?: string;
}
