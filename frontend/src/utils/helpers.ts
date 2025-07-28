// Utility functions for the quiz application

/**
 * Format time in seconds to MM:SS format
 */
export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Format time for display with units
 */
export const formatTimeWithUnits = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const remainingSecs = seconds % 60;
  
  if (mins === 0) return `${remainingSecs}s`;
  if (remainingSecs === 0) return `${mins}m`;
  return `${mins}m ${remainingSecs}s`;
};

/**
 * Calculate percentage with specified decimal places
 */
export const calculatePercentage = (correct: number, total: number, decimals = 1): number => {
  if (total === 0) return 0;
  return Math.round((correct / total) * 100 * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

/**
 * Get difficulty color for MUI components
 */
export const getDifficultyColor = (difficulty: string): 'success' | 'warning' | 'error' | 'default' => {
  switch (difficulty) {
    case 'beginner': return 'success';
    case 'intermediate': return 'warning';
    case 'advanced': return 'error';
    default: return 'default';
  }
};

/**
 * Get score color based on performance
 */
export const getScoreColor = (score: number): 'success' | 'warning' | 'error' => {
  if (score >= 80) return 'success';
  if (score >= 60) return 'warning';
  return 'error';
};

/**
 * Debounce function for performance optimization
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void => {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

/**
 * Generate a random session ID (fallback if backend doesn't provide one)
 */
export const generateSessionId = (): string => {
  return `quiz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Validate quiz response structure
 */
export const isValidQuizResponse = (response: any): boolean => {
  return (
    response &&
    typeof response === 'object' &&
    typeof response.success === 'boolean' &&
    (response.success === false || response.data !== undefined)
  );
};

/**
 * Safe local storage operations
 */
export const safeLocalStorage = {
  get: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn('LocalStorage get failed:', error);
      return null;
    }
  },
  
  set: (key: string, value: string): boolean => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn('LocalStorage set failed:', error);
      return false;
    }
  },
  
  remove: (key: string): boolean => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn('LocalStorage remove failed:', error);
      return false;
    }
  }
};

/**
 * Analytics/tracking utilities (placeholder for future implementation)
 */
export const analytics = {
  trackQuizStart: (difficulty: string) => {
    console.log('Quiz started:', { difficulty, timestamp: new Date().toISOString() });
  },
  
  trackQuizComplete: (sessionId: string, score: number, timeSpent: number) => {
    console.log('Quiz completed:', { sessionId, score, timeSpent, timestamp: new Date().toISOString() });
  },
  
  trackQuestionAnswer: (questionId: string, isCorrect: boolean, timeSpent: number) => {
    console.log('Question answered:', { questionId, isCorrect, timeSpent, timestamp: new Date().toISOString() });
  }
};
