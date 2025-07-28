#!/usr/bin/env node

/**
 * Simple backend startup test
 */

console.log('🧪 Testing backend startup...');

try {
  // Test basic imports
  console.log('1. Testing basic imports...');
  const express = require('express');
  console.log('   ✅ Express imported successfully');
  
  const cors = require('cors');
  console.log('   ✅ CORS imported successfully');
  
  const helmet = require('helmet');
  console.log('   ✅ Helmet imported successfully');
  
  console.log('\n2. Testing TypeScript compilation...');
  const { spawn } = require('child_process');
  
  const tscProcess = spawn('npx', ['tsc', '--noEmit'], {
    cwd: process.cwd(),
    stdio: 'pipe'
  });
  
  tscProcess.on('close', (code) => {
    if (code === 0) {
      console.log('   ✅ TypeScript compilation successful');
      console.log('\n3. Testing app.ts import...');
      
      // Try to import app.ts
      try {
        require('./src/app.ts');
        console.log('   ✅ App.ts imported successfully');
        console.log('\n🎉 Backend should be able to start successfully!');
        console.log('\nTo start the backend, run:');
        console.log('   npm run dev   (with nodemon)');
        console.log('   npm run server   (with ts-node)');
      } catch (appError) {
        console.error('   ❌ Error importing app.ts:', appError.message);
      }
    } else {
      console.error('   ❌ TypeScript compilation failed');
    }
  });
  
} catch (error) {
  console.error('❌ Backend test failed:', error.message);
}
