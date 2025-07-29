import React from 'react';
import { Box, Typography, Paper, Chip, Divider } from '@mui/material';
import { QuestionMark } from '@mui/icons-material';

// Test component to demonstrate the explanation formatting fix
const ExplanationTest: React.FC = () => {
  // Sample explanation with escaped characters (like what comes from the backend)
  const sampleExplanation = "Amazon SageMaker Managed Spot Training is the most cost-effective solution for this scenario. Here's why:\\n\\n1. Managed Spot Training can reduce training costs by up to 90% by using Amazon EC2 Spot instances instead of on-demand instances.\\n2. SageMaker automatically manages the Spot instances, including bidding and instance interruption handling.\\n3. The training job can automatically resume from checkpoints if interrupted.\\n\\nWhy other options are wrong:\\n\\n- Option A: Regular SageMaker training instances use on-demand pricing\\n- Option B: EC2 instances require manual management of the ML training infrastructure\\n- Option C: Batch computing is not optimized for ML training workloads";

  // Fixed formatExplanation function
  const formatExplanation = (explanation: string) => {
    // First, unescape the text by replacing literal \n with actual newlines and removing extra escapes
    let unescapedText = explanation
      .replace(/\\n/g, '\n')  // Replace literal \n with actual newlines
      .replace(/\\"/g, '"')   // Replace escaped quotes
      .replace(/\\\\/g, '\\') // Replace double backslashes with single backslash
      .trim();

    // Try to split the explanation into main content and option explanations
    const splitPatterns = [
      /The other options are (suboptimal|incorrect) because:/i,
      /Why the other options are wrong:/i,
      /Other options are incorrect:/i,
      /Why other options are wrong:/i
    ];
    
    let parts: string[] = [unescapedText];
    let splitIndex = -1;
    
    // Try each pattern to find where options explanations start
    for (const pattern of splitPatterns) {
      const tempParts = unescapedText.split(pattern);
      if (tempParts.length > 1) {
        parts = tempParts;
        splitIndex = unescapedText.search(pattern);
        break;
      }
    }

    if (parts.length === 1) {
      // No option explanations found, return as is but formatted nicely
      return (
        <Typography variant="body1" sx={{ lineHeight: 1.6, whiteSpace: 'pre-line' }}>
          {unescapedText}
        </Typography>
      );
    }

    const mainExplanation = parts[0].trim();
    const optionSection = parts[parts.length - 1]; // Get the last part (options)

    // Extract individual option explanations using regex
    const optionMatches = optionSection.match(/- Option [A-D]:[^-]+/gi) || [];
    
    return (
      <Box>
        {/* Main explanation */}
        <Typography variant="body1" sx={{ lineHeight: 1.6, mb: 2, whiteSpace: 'pre-line' }}>
          {mainExplanation}
        </Typography>
        
        {/* Option explanations */}
        {optionMatches.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" sx={{ mb: 2, color: 'text.secondary', fontSize: '1.1rem' }}>
              Why other options are incorrect:
            </Typography>
            {optionMatches.map((optionText, index) => {
              // Extract option letter and explanation
              const match = optionText.match(/- Option ([A-D]):\s*(.+)/i);
              if (!match) return null;
              
              const optionLetter = match[1];
              const explanationText = match[2].trim();
              
              return (
                <Box key={index} sx={{ 
                  display: 'flex', 
                  mb: 1.5, 
                  alignItems: 'flex-start',
                  gap: 1
                }}>
                  <Chip 
                    label={`Option ${optionLetter}`}
                    size="small"
                    color="error"
                    variant="outlined"
                    sx={{ 
                      minWidth: '80px',
                      fontWeight: 'bold',
                      fontSize: '0.75rem'
                    }}
                  />
                  <Typography variant="body2" sx={{ 
                    lineHeight: 1.5,
                    flex: 1,
                    pt: 0.5
                  }}>
                    {explanationText}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ p: 4, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Explanation Formatting Test
      </Typography>
      
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Raw Text (with escaped characters):
        </Typography>
        <Paper sx={{ p: 2, bgcolor: 'grey.100' }}>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
            {sampleExplanation}
          </Typography>
        </Paper>
      </Box>

      <Box>
        <Typography variant="h6" gutterBottom>
          Formatted Output:
        </Typography>
        <Paper sx={{ p: 3, bgcolor: 'info.50' }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <QuestionMark color="info" />
            Explanation
          </Typography>
          <Divider sx={{ mb: 2 }} />
          {formatExplanation(sampleExplanation)}
        </Paper>
      </Box>
    </Box>
  );
};

export default ExplanationTest;
