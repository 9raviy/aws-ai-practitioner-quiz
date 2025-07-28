import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  Typography,
  Button,
  RadioGroup,
  FormControlLabel,
  Radio,
  Box,
  Alert,
  CircularProgress,
  LinearProgress,
  Chip,
  Divider,
  Paper
} from '@mui/material';
import { 
  CheckCircle, 
  Cancel, 
  Timer, 
  QuestionMark,
  NavigateNext,
  Assessment 
} from '@mui/icons-material';
import { apiService } from '../services/api.service';
import { QuizQuestion, LoadingState, ErrorState } from '../types/quiz.types';

const QuizQuestionComponent: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  // State management
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [selectedOption, setSelectedOption] = useState<number>(-1);
  const [loading, setLoading] = useState<LoadingState>({ isLoading: true });
  const [error, setError] = useState<ErrorState>({ hasError: false, message: '' });
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState<{
    isCorrect: boolean;
    explanation: string;
    currentScore: number;
    nextQuestionNumber?: number;
  } | null>(null);
  
  // Quiz progress state
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(1);
  const [totalQuestions] = useState(10);
  const [timeSpent, setTimeSpent] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState<Date>(new Date());

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      if (!showFeedback) {
        setTimeSpent(Math.floor((new Date().getTime() - questionStartTime.getTime()) / 1000));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [questionStartTime, showFeedback]);

  // Load question on component mount and question number change
  useEffect(() => {
    if (sessionId) {
      loadQuestion(currentQuestionNumber);
    }
  }, [sessionId, currentQuestionNumber]);

  const loadQuestion = async (questionNumber: number) => {
    if (!sessionId) return;

    setLoading({ isLoading: true, message: 'Loading question...' });
    setError({ hasError: false, message: '' });
    setShowFeedback(false);
    setSelectedOption(-1);
    setQuestionStartTime(new Date());
    setTimeSpent(0);

    try {
      const response = await apiService.getQuestion(sessionId);

      if (response.success && response.data) {
        setQuestion(response.data);
      } else {
        throw new Error(response.error || 'Failed to load question');
      }
    } catch (err) {
      setError({
        hasError: true,
        message: err instanceof Error ? err.message : 'Failed to load question'
      });
    } finally {
      setLoading({ isLoading: false });
    }
  };

  const handleOptionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedOption(parseInt(event.target.value));
  };

  const submitAnswer = async () => {
    if (!sessionId || !question || selectedOption === -1) return;

    setLoading({ isLoading: true, message: 'Submitting answer...' });

    try {
      const response = await apiService.submitAnswer({
        sessionId,
        questionId: question.id,
        selectedAnswer: selectedOption,
        timeSpent
      });

      if (response.success && response.data) {
        setFeedback(response.data);
        setShowFeedback(true);
      } else {
        throw new Error(response.error || 'Failed to submit answer');
      }
    } catch (err) {
      setError({
        hasError: true,
        message: err instanceof Error ? err.message : 'Failed to submit answer'
      });
    } finally {
      setLoading({ isLoading: false });
    }
  };

  const nextQuestion = () => {
    if (feedback?.nextQuestionNumber) {
      setCurrentQuestionNumber(feedback.nextQuestionNumber);
    } else {
      // Quiz completed, navigate to results
      navigate(`/results/${sessionId}`);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'success';
      case 'intermediate': return 'warning';
      case 'advanced': return 'error';
      default: return 'default';
    }
  };

  if (loading.isLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 4 }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          {loading.message}
        </Typography>
      </Box>
    );
  }

  if (error.hasError) {
    return (
      <Alert severity="error" sx={{ mt: 4 }}>
        {error.message}
      </Alert>
    );
  }

  if (!question) {
    return (
      <Alert severity="warning" sx={{ mt: 4 }}>
        No question data available
      </Alert>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4 }}>
      {/* Progress Bar */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ pb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6">
              Question {currentQuestionNumber} of {totalQuestions}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {question?.difficulty && (
                <Chip 
                  label={question.difficulty} 
                  color={getDifficultyColor(question.difficulty) as any}
                  size="small"
                />
              )}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Timer fontSize="small" />
                <Typography variant="body2">
                  {formatTime(timeSpent)}
                </Typography>
              </Box>
            </Box>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={(currentQuestionNumber / totalQuestions) * 100} 
            sx={{ height: 8, borderRadius: 4 }}
          />
          {feedback && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Current Score: {feedback.currentScore}%
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Question Card */}
      <Card>
        <CardContent sx={{ p: 4 }}>
          {/* Question Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <QuestionMark color="primary" />
            <Typography variant="h5" component="h2">
              Question {currentQuestionNumber}
            </Typography>
          </Box>

          {/* Question Text */}
          <Paper sx={{ p: 3, mb: 4, bgcolor: 'primary.50' }}>
            <Typography variant="h6" sx={{ lineHeight: 1.6 }}>
              {question.question}
            </Typography>
          </Paper>

          {/* Answer Options */}
          <RadioGroup
            value={selectedOption.toString()}
            onChange={handleOptionChange}
            sx={{ mb: 3 }}
          >
            {question?.options?.map((option, index) => (
              <FormControlLabel
                key={index}
                value={index.toString()}
                control={<Radio />}
                label={
                  <Typography variant="body1" sx={{ py: 1 }}>
                    {option}
                  </Typography>
                }
                disabled={showFeedback}
                sx={{
                  border: 1,
                  borderColor: showFeedback ? 
                    (index === selectedOption ? 
                      (feedback?.isCorrect ? 'success.main' : 'error.main') : 
                      'divider') : 
                    'divider',
                  borderRadius: 2,
                  p: 2,
                  mb: 1,
                  bgcolor: showFeedback && index === selectedOption ? 
                    (feedback?.isCorrect ? 'success.50' : 'error.50') : 
                    'background.paper',
                  '&:hover': !showFeedback ? { borderColor: 'primary.main' } : {}
                }}
              />
            ))}
          </RadioGroup>

          {/* Feedback Section */}
          {showFeedback && feedback && (
            <Box sx={{ mt: 4 }}>
              <Divider sx={{ mb: 3 }} />
              
              <Alert 
                severity={feedback.isCorrect ? 'success' : 'error'}
                icon={feedback.isCorrect ? <CheckCircle /> : <Cancel />}
                sx={{ mb: 3 }}
              >
                <Typography variant="h6">
                  {feedback.isCorrect ? 'Correct!' : 'Incorrect'}
                </Typography>
              </Alert>

              {feedback.explanation && (
                <Paper sx={{ p: 3, bgcolor: 'info.50' }}>
                  <Typography variant="h6" gutterBottom>
                    Explanation:
                  </Typography>
                  <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
                    {feedback.explanation}
                  </Typography>
                </Paper>
              )}
            </Box>
          )}

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            {!showFeedback ? (
              <Button
                variant="contained"
                size="large"
                onClick={submitAnswer}
                disabled={selectedOption === -1 || loading.isLoading}
                sx={{ px: 4, py: 2 }}
              >
                Submit Answer
              </Button>
            ) : (
              <Button
                variant="contained"
                size="large"
                onClick={nextQuestion}
                endIcon={feedback?.nextQuestionNumber ? <NavigateNext /> : <Assessment />}
                sx={{ px: 4, py: 2 }}
              >
                {feedback?.nextQuestionNumber ? 'Next Question' : 'View Results'}
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default QuizQuestionComponent;
