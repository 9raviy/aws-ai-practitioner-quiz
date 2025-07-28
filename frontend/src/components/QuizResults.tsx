import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Alert,
  CircularProgress,
  Grid,
  Paper,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  EmojiEvents,
  Assessment,
  Timer,
  TrendingUp,
  CheckCircle,
  Cancel,
  Refresh,
  Home,
  Psychology
} from '@mui/icons-material';
import { apiService } from '../services/api.service';
import { QuizResults, LoadingState, ErrorState } from '../types/quiz.types';

const QuizResultsComponent: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  // State management
  const [results, setResults] = useState<QuizResults | null>(null);
  const [loading, setLoading] = useState<LoadingState>({ isLoading: true });
  const [error, setError] = useState<ErrorState>({ hasError: false, message: '' });

  // Load results on component mount
  useEffect(() => {
    if (sessionId) {
      loadResults();
    }
  }, [sessionId]);

  const loadResults = async () => {
    if (!sessionId) return;

    setLoading({ isLoading: true, message: 'Loading your results...' });
    setError({ hasError: false, message: '' });

    try {
      const response = await apiService.getResults(sessionId);

      if (response.success && response.data) {
        setResults(response.data);
      } else {
        throw new Error(response.error || 'Failed to load results');
      }
    } catch (err) {
      setError({
        hasError: true,
        message: err instanceof Error ? err.message : 'Failed to load results'
      });
    } finally {
      setLoading({ isLoading: false });
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const getPerformanceMessage = (score: number) => {
    if (score >= 90) return 'Outstanding! You have excellent knowledge of AWS AI services.';
    if (score >= 80) return 'Great job! You have a strong understanding of AWS AI concepts.';
    if (score >= 70) return 'Good work! You have solid foundational knowledge.';
    if (score >= 60) return 'Not bad! Consider reviewing some key concepts.';
    return 'Keep studying! Practice with more questions to improve your knowledge.';
  };

  const startNewQuiz = () => {
    navigate('/');
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
      <Box sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error.message}
        </Alert>
        <Button 
          variant="contained" 
          onClick={loadResults}
          startIcon={<Refresh />}
        >
          Try Again
        </Button>
      </Box>
    );
  }

  if (!results) {
    return (
      <Alert severity="warning" sx={{ mt: 4 }}>
        No results data available
      </Alert>
    );
  }

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', mt: 4 }}>
      {/* Header Card */}
      <Card sx={{ mb: 4, textAlign: 'center' }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <EmojiEvents sx={{ fontSize: 60, color: 'primary.main' }} />
          </Box>
          <Typography variant="h4" gutterBottom>
            Quiz Complete!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {getPerformanceMessage(results.score)}
          </Typography>
        </CardContent>
      </Card>

      {/* Score Overview */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card sx={{ textAlign: 'center', height: '100%' }}>
            <CardContent>
              <Assessment sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h4" color={`${getScoreColor(results.score)}.main`}>
                {results.score}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Final Score
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ textAlign: 'center', height: '100%' }}>
            <CardContent>
              <CheckCircle sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
              <Typography variant="h4">
                {results.correctAnswers}/{results.totalQuestions}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Correct Answers
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ textAlign: 'center', height: '100%' }}>
            <CardContent>
              <Timer sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
              <Typography variant="h4">
                {formatTime(results.totalTime)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Time
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ textAlign: 'center', height: '100%' }}>
            <CardContent>
              <TrendingUp sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
              <Typography variant="h4">
                {formatTime(results.averageTimePerQuestion)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Avg per Question
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Performance Details */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Psychology />
                Performance Details
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <Assessment />
                  </ListItemIcon>
                  <ListItemText
                    primary="Accuracy"
                    secondary={`${results.accuracy.toFixed(1)}%`}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <Chip 
                      label={results.difficulty} 
                      size="small" 
                      color={results.difficulty === 'advanced' ? 'error' : 
                             results.difficulty === 'intermediate' ? 'warning' : 'success'}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary="Difficulty Level"
                    secondary={`${results.difficulty.charAt(0).toUpperCase() + results.difficulty.slice(1)} level questions`}
                  />
                </ListItem>

                {results.recommendedNextLevel && (
                  <ListItem>
                    <ListItemIcon>
                      <TrendingUp />
                    </ListItemIcon>
                    <ListItemText
                      primary="Recommended Next Level"
                      secondary={`Try ${results.recommendedNextLevel} difficulty`}
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Topic Breakdown */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Topic Performance
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              {Object.entries(results.topicBreakdown).map(([topic, stats]) => (
                <Box key={topic} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {topic}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {stats.accuracy >= 70 ? (
                        <CheckCircle sx={{ fontSize: 20, color: 'success.main' }} />
                      ) : (
                        <Cancel sx={{ fontSize: 20, color: 'error.main' }} />
                      )}
                      <Typography variant="body2">
                        {stats.correct}/{stats.total} ({stats.accuracy.toFixed(0)}%)
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* AI Feedback */}
        {results.feedback && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  AI-Powered Feedback
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Paper sx={{ p: 3, bgcolor: 'info.50' }}>
                  <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
                    {results.feedback}
                  </Typography>
                </Paper>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Action Buttons */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 2 }}>
            <Button
              variant="contained"
              size="large"
              onClick={startNewQuiz}
              startIcon={<Refresh />}
              sx={{ px: 4 }}
            >
              Take Another Quiz
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/')}
              startIcon={<Home />}
              sx={{ px: 4 }}
            >
              Back to Home
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default QuizResultsComponent;
