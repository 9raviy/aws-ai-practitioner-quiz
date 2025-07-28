import { BedrockService } from './services/bedrock.service';
import { QuizDifficulty, BedrockRequest } from './types/quiz.types';

/**
 * Test script to verify AWS Bedrock connectivity and question generation
 */
async function testBedrockConnection() {
  console.log('🚀 Testing AWS Bedrock connection...\n');

  const bedrockService = new BedrockService();

  try {
    // Test 1: Basic connection test
    console.log('Test 1: Basic connection test');
    const isConnected = await bedrockService.testConnection();
    
    if (isConnected) {
      console.log('✅ Bedrock connection successful!\n');
    } else {
      console.log('❌ Bedrock connection failed!\n');
      return;
    }

    // Test 2: Generate a beginner question
    console.log('Test 2: Generating a beginner-level question');
    const beginnerRequest: BedrockRequest = {
      difficulty: QuizDifficulty.BEGINNER,
      topic: 'Amazon SageMaker basics'
    };

    const beginnerResponse = await bedrockService.generateQuestion(beginnerRequest);
    console.log('✅ Beginner question generated:');
    console.log(`Question: ${beginnerResponse.question.question}`);
    console.log(`Options: ${beginnerResponse.question.options.join(', ')}`);
    console.log(`Correct Answer: ${beginnerResponse.question.options[beginnerResponse.question.correctAnswer]}`);
    console.log(`Topic: ${beginnerResponse.question.topic}`);
    console.log(`Generation Time: ${beginnerResponse.generationTime}ms\n`);

    // Test 3: Generate an intermediate question
    console.log('Test 3: Generating an intermediate-level question');
    const intermediateRequest: BedrockRequest = {
      difficulty: QuizDifficulty.INTERMEDIATE,
      topic: 'Amazon Bedrock implementation'
    };

    const intermediateResponse = await bedrockService.generateQuestion(intermediateRequest);
    console.log('✅ Intermediate question generated:');
    console.log(`Question: ${intermediateResponse.question.question}`);
    console.log(`Correct Answer: ${intermediateResponse.question.options[intermediateResponse.question.correctAnswer]}`);
    console.log(`Explanation: ${intermediateResponse.question.explanation}`);
    console.log(`Generation Time: ${intermediateResponse.generationTime}ms\n`);

    console.log('🎉 All tests passed! Bedrock integration is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('\n🔍 Troubleshooting tips:');
    console.error('1. Ensure AWS credentials are configured (aws configure)');
    console.error('2. Verify your AWS account has Bedrock access in us-west-2');
    console.error('3. Check that Claude 3.5 Sonnet model is available in your account');
    console.error('4. Ensure proper IAM permissions for Bedrock service');
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testBedrockConnection().catch(console.error);
}

export { testBedrockConnection };
