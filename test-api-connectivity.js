#!/usr/bin/env node

/**
 * Simple API connectivity test for the AWS AI Quiz application
 * Run this to test if frontend can communicate with backend
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001';

async function testApiConnectivity() {
  console.log('🧪 Testing AWS AI Quiz API connectivity...\n');

  try {
    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${API_BASE_URL}/api/v1/health`);
    console.log('   ✅ Health check passed:', healthResponse.data.data.status);

    // Test 2: Start quiz session
    console.log('\n2. Testing start quiz endpoint...');
    const startQuizResponse = await axios.post(`${API_BASE_URL}/api/v1/quiz/start`, {
      difficulty: 'beginner',
      userId: 'test_user_123'
    });
    
    if (startQuizResponse.data.success) {
      const sessionId = startQuizResponse.data.data.sessionId;
      console.log('   ✅ Quiz session started:', sessionId);

      // Test 3: Get first question
      console.log('\n3. Testing get question endpoint...');
      const questionResponse = await axios.get(`${API_BASE_URL}/api/v1/quiz/question/${sessionId}`);
      
      if (questionResponse.data.success) {
        console.log('   ✅ Question retrieved successfully');
        console.log('   📝 Question:', questionResponse.data.data.question.substring(0, 50) + '...');
      } else {
        console.log('   ❌ Failed to get question');
      }
    } else {
      console.log('   ❌ Failed to start quiz session');
    }

    console.log('\n🎉 All API tests passed! Frontend and backend are ready.');

  } catch (error) {
    console.error('\n❌ API test failed:');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    } else if (error.request) {
      console.error('   No response received - make sure backend is running on port 3001');
    } else {
      console.error('   Error:', error.message);
    }
    
    console.log('\n💡 Troubleshooting tips:');
    console.log('   1. Make sure backend is running: cd backend && npm run dev');
    console.log('   2. Check if port 3001 is available');
    console.log('   3. Verify AWS credentials are configured');
  }
}

// Run the test
testApiConnectivity();
