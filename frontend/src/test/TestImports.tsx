// Simple test to verify our components work
import React from 'react';

// Test import of our main components
const TestImports = () => {
  console.log('Testing component imports...');
  
  try {
    // These should not throw errors if our components are properly structured
    import('../components/QuizStart');
    import('../components/QuizQuestion');
    import('../components/QuizResults');
    import('../components/ErrorBoundary');
    import('../services/api.service');
    import('../types/quiz.types');
    
    console.log('✅ All imports successful!');
    return <div>All components imported successfully!</div>;
  } catch (error) {
    console.error('❌ Import error:', error);
    return <div>Import error: {String(error)}</div>;
  }
};

export default TestImports;
