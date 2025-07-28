import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  Typography,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Box,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material';
import { PlayArrow, Psychology, School, EmojiEvents } from '@mui/icons-material';
import { apiService } from '../services/api.service';
import { LoadingState, ErrorState } from '../types/quiz.types';

const QuizStart: React.FC = () => {
  const navigate = useNavigate();
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [loading, setLoading] = useState<LoadingState>({ isLoading: false });
  const [error, setError] = useState<ErrorState>({ hasError: false, message: '' });
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  // Check API connectivity on component mount
  useEffect(() => {
    checkApiConnection();
  }, []);

  const checkApiConnection = async () => {
    try {
      await apiService.healthCheck();
      setIsConnected(true);
    } catch (err) {
      setIsConnected(false);
      console.warn('API connection check failed:', err);
    }
  };

  const handleDifficultyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDifficulty(event.target.value as 'beginner' | 'intermediate' | 'advanced');
  };

  const startQuiz = async () => {
    setLoading({ isLoading: true, message: 'Starting your quiz...' });
    setError({ hasError: false, message: '' });

    try {
      const response = await apiService.startQuiz({
        difficulty,
        userId: `user_${Date.now()}`, // Generate a simple user ID
        preferences: {
          timeLimit: 600 // 10 minutes
        }
      });

      if (response.success && response.data) {
        navigate(`/quiz/${response.data.sessionId}`);
      } else {
        throw new Error(response.error || 'Failed to start quiz');
      }
    } catch (err) {
      setError({
        hasError: true,
        message: err instanceof Error ? err.message : 'Failed to start quiz'
      });
    } finally {
      setLoading({ isLoading: false });
    }
  };

  const getDifficultyIcon = (level: string) => {
    switch (level) {
      case 'beginner': return <School />;
      case 'intermediate': return <Psychology />;
      case 'advanced': return <EmojiEvents />;
      default: return <School />;
    }
  };

  const getDifficultyDescription = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'Perfect for those new to AWS AI services. Covers basic concepts and terminology.';
      case 'intermediate':
        return 'For those with some AWS experience. Includes practical implementation scenarios.';
      case 'advanced':
        return 'Challenging questions for experienced practitioners. Deep technical knowledge required.';
      default:
        return '';
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <Card sx={{ maxWidth: 600, width: '100%', mx: 2 }}>
        <CardContent sx={{ p: 4 }}>
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom color="primary">
              AWS AI Practitioner Quiz
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Test your knowledge with our adaptive AI-powered quiz system
            </Typography>
            
            {/* Connection Status */}
            <Box sx={{ mt: 2 }}>
              {isConnected === null ? (
                <Chip 
                  label="Checking connection..." 
                  size="small" 
                  variant="outlined" 
                />
              ) : isConnected ? (
                <Chip 
                  label="✅ Connected to server" 
                  size="small" 
                  color="success" 
                  variant="outlined" 
                />
              ) : (
                <Chip 
                  label="⚠️ Server offline - Demo mode" 
                  size="small" 
                  color="warning" 
                  variant="outlined" 
                />
              )}
            </Box>
          </Box>

          {/* Error Display */}
          {error.hasError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error.message}
            </Alert>
          )}

          {/* Difficulty Selection */}
          <FormControl component="fieldset" sx={{ width: '100%', mb: 4 }}>
            <FormLabel component="legend" sx={{ mb: 2, fontSize: '1.1rem', fontWeight: 500 }}>
              Choose Your Difficulty Level
            </FormLabel>
            <RadioGroup
              value={difficulty}
              onChange={handleDifficultyChange}
              sx={{ gap: 2 }}
            >
              {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
                <Card 
                  key={level}
                  variant={difficulty === level ? 'elevation' : 'outlined'}
                  sx={{ 
                    p: 2, 
                    cursor: 'pointer',
                    border: difficulty === level ? 2 : 1,
                    borderColor: difficulty === level ? 'primary.main' : 'divider',
                    '&:hover': { borderColor: 'primary.main' }
                  }}
                  onClick={() => setDifficulty(level)}
                >
                  <FormControlLabel
                    value={level}
                    control={<Radio />}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                        {getDifficultyIcon(level)}
                        <Box>
                          <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
                            {level}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {getDifficultyDescription(level)}
                          </Typography>
                        </Box>
                      </Box>
                    }
                    sx={{ margin: 0, width: '100%' }}
                  />
                </Card>
              ))}
            </RadioGroup>
          </FormControl>

          {/* Quiz Info */}
          <Box sx={{ bgcolor: 'primary.50', p: 2, borderRadius: 2, mb: 3 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Quiz Format:</strong> 10 adaptive questions • Real-time feedback • Progress tracking
            </Typography>
          </Box>

          {/* Start Button */}
          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={startQuiz}
            disabled={loading.isLoading}
            startIcon={loading.isLoading ? <CircularProgress size={20} /> : <PlayArrow />}
            sx={{ py: 2, fontSize: '1.1rem' }}
          >
            {loading.isLoading ? loading.message : 'Start Quiz'}
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
};

export default QuizStart;
