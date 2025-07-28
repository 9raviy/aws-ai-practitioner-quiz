import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { QuizSession, QuizQuestion, LoadingState, ErrorState } from '../types/quiz.types';

// Quiz Context State
interface QuizState {
  session: QuizSession | null;
  currentQuestion: QuizQuestion | null;
  loading: LoadingState;
  error: ErrorState;
  isQuizActive: boolean;
  selectedAnswer: number | null;
  timeSpent: number;
}

// Quiz Actions
type QuizAction =
  | { type: 'SET_LOADING'; payload: LoadingState }
  | { type: 'SET_ERROR'; payload: ErrorState }
  | { type: 'SET_SESSION'; payload: QuizSession }
  | { type: 'SET_CURRENT_QUESTION'; payload: QuizQuestion }
  | { type: 'SET_SELECTED_ANSWER'; payload: number | null }
  | { type: 'SET_TIME_SPENT'; payload: number }
  | { type: 'START_QUIZ' }
  | { type: 'END_QUIZ' }
  | { type: 'RESET_QUIZ' };

// Initial state
const initialState: QuizState = {
  session: null,
  currentQuestion: null,
  loading: { isLoading: false },
  error: { hasError: false, message: '' },
  isQuizActive: false,
  selectedAnswer: null,
  timeSpent: 0,
};

// Reducer function
const quizReducer = (state: QuizState, action: QuizAction): QuizState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'SET_SESSION':
      return { ...state, session: action.payload };
    
    case 'SET_CURRENT_QUESTION':
      return { 
        ...state, 
        currentQuestion: action.payload, 
        selectedAnswer: null, 
        timeSpent: 0 
      };
    
    case 'SET_SELECTED_ANSWER':
      return { ...state, selectedAnswer: action.payload };
    
    case 'SET_TIME_SPENT':
      return { ...state, timeSpent: action.payload };
    
    case 'START_QUIZ':
      return { 
        ...state, 
        isQuizActive: true, 
        error: { hasError: false, message: '' } 
      };
    
    case 'END_QUIZ':
      return { ...state, isQuizActive: false };
    
    case 'RESET_QUIZ':
      return { ...initialState };
    
    default:
      return state;
  }
};

// Context
const QuizContext = createContext<{
  state: QuizState;
  dispatch: React.Dispatch<QuizAction>;
} | null>(null);

// Provider component
interface QuizProviderProps {
  children: ReactNode;
}

export const QuizProvider: React.FC<QuizProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(quizReducer, initialState);

  return (
    <QuizContext.Provider value={{ state, dispatch }}>
      {children}
    </QuizContext.Provider>
  );
};

// Custom hook to use quiz context
export const useQuiz = () => {
  const context = useContext(QuizContext);
  if (!context) {
    throw new Error('useQuiz must be used within a QuizProvider');
  }
  return context;
};

// Action creators for convenience
export const quizActions = {
  setLoading: (loading: LoadingState): QuizAction => ({
    type: 'SET_LOADING',
    payload: loading,
  }),
  
  setError: (error: ErrorState): QuizAction => ({
    type: 'SET_ERROR',
    payload: error,
  }),
  
  setSession: (session: QuizSession): QuizAction => ({
    type: 'SET_SESSION',
    payload: session,
  }),
  
  setCurrentQuestion: (question: QuizQuestion): QuizAction => ({
    type: 'SET_CURRENT_QUESTION',
    payload: question,
  }),
  
  setSelectedAnswer: (answer: number | null): QuizAction => ({
    type: 'SET_SELECTED_ANSWER',
    payload: answer,
  }),
  
  setTimeSpent: (time: number): QuizAction => ({
    type: 'SET_TIME_SPENT',
    payload: time,
  }),
  
  startQuiz: (): QuizAction => ({ type: 'START_QUIZ' }),
  endQuiz: (): QuizAction => ({ type: 'END_QUIZ' }),
  resetQuiz: (): QuizAction => ({ type: 'RESET_QUIZ' }),
};
