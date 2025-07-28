#!/usr/bin/env node

/**
 * AWS Credentials and Bedrock connectivity test
 */

const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

async function testBedrockConnection() {
  console.log('🔍 Testing AWS Bedrock connectivity...\n');

  try {
    // Test 1: Check environment variables
    console.log('1. Checking environment variables...');
    console.log('   AWS_REGION:', process.env.AWS_REGION || 'not set');
    console.log('   AWS_PROFILE:', process.env.AWS_PROFILE || 'not set');
    console.log('   NODE_ENV:', process.env.NODE_ENV || 'not set');

    // Test 2: Initialize Bedrock client
    console.log('\n2. Initializing Bedrock client...');
    const client = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || 'us-west-2',
    });
    console.log('   ✅ Bedrock client initialized');

    // Test 3: Try a simple model invocation
    console.log('\n3. Testing model invocation...');
    const input = {
      modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: 'Say "Hello, this is a test!"'
          }
        ]
      })
    };

    const command = new InvokeModelCommand(input);
    const response = await client.send(command);
    
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    console.log('   ✅ Model invocation successful!');
    console.log('   📝 Response:', responseBody.content[0].text);

    console.log('\n🎉 Bedrock connection test PASSED!');
    console.log('\nThe backend should work properly with AWS Bedrock.');

  } catch (error) {
    console.error('\n❌ Bedrock connection test FAILED:');
    
    if (error.name === 'CredentialsProviderError') {
      console.error('   🔑 AWS credentials not found or invalid');
      console.error('   💡 Solutions:');
      console.error('      1. Run: aws configure');
      console.error('      2. Set AWS_PROFILE environment variable');
      console.error('      3. Ensure AWS credentials file exists');
    } else if (error.name === 'AccessDeniedException') {
      console.error('   🚫 Access denied to Bedrock service');
      console.error('   💡 Solutions:');
      console.error('      1. Check IAM permissions for Bedrock');
      console.error('      2. Ensure Claude model access is enabled');
    } else if (error.code === 'ValidationException') {
      console.error('   📝 Model or request validation error');
      console.error('   💡 Check model ID and request format');
    } else {
      console.error('   🔗 Network or service error:', error.message);
      console.error('   💡 Check internet connection and AWS service status');
    }
    
    console.error('\nFull error details:', error);
  }
}

// Load environment variables
require('dotenv').config();

// Run the test
testBedrockConnection();
