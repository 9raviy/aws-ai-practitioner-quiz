# Development Guide

## Getting Started

This guide covers local development setup for the AWS AI Practitioner Quiz application.

## Prerequisites

### Required Software

1. **Node.js** (v18 or later)
   ```bash
   node --version  # Should be v18+
   npm --version   # Should be 8+
   ```

2. **AWS CLI** (for deployment and testing)
   ```bash
   aws --version
   aws configure  # Set up your credentials
   ```

3. **Git**
   ```bash
   git --version
   ```

### AWS Account Setup

1. **Create AWS Account** (if needed)
2. **Create IAM User** with programmatic access
3. **Attach Required Policies:**
   - `PowerUserAccess` (or custom policy with required permissions)
   - CloudFormation, Lambda, S3, DynamoDB, API Gateway access

4. **Configure AWS CLI**
   ```bash
   aws configure
   # AWS Access Key ID: <your-access-key>
   # AWS Secret Access Key: <your-secret-key>
   # Default region: us-east-1
   # Default output format: json
   ```

## Local Development Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd codebase
```

### 2. Backend Setup

```bash
cd backend
npm install

# Copy environment template
cp .env.example .env
# Edit .env with your AWS credentials and settings
```

**Backend Environment Variables (`.env`):**
```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
BEDROCK_REGION=us-east-1
DYNAMODB_TABLE_PREFIX=quiz-dev
API_KEY=your_development_api_key
CORS_ORIGIN=http://localhost:5173
```

### 3. Frontend Setup

```bash
cd frontend
npm install

# Copy environment template
cp .env.example .env.local
# Edit .env.local with development settings
```

**Frontend Environment Variables (`.env.local`):**
```env
VITE_API_URL=http://localhost:3000
VITE_API_KEY=your_development_api_key
VITE_ENVIRONMENT=development
```

### 4. AWS Infrastructure (Optional for Local Dev)

For full local testing, deploy development infrastructure:

```bash
# Deploy development stack
aws cloudformation deploy \
  --template-file infrastructure/cloudformation.yaml \
  --stack-name quiz-infrastructure-dev \
  --parameter-overrides Environment=dev \
  --capabilities CAPABILITY_IAM
```

## Running Locally

### Backend Development Server

```bash
cd backend
npm run dev
```

This starts the Express server on `http://localhost:3000` with:
- Hot reload on file changes
- Debug logging enabled
- Local DynamoDB connection (or AWS if configured)
- CORS enabled for frontend development

### Frontend Development Server

```bash
cd frontend
npm run dev
```

This starts the Vite development server on `http://localhost:5173` with:
- Hot module replacement (HMR)
- Fast refresh for React components
- Proxy to backend API
- Development build optimizations

### Full Stack Development

Run both servers simultaneously:

```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend  
cd frontend && npm run dev
```

Access the application at `http://localhost:5173`

## Project Structure

```
codebase/
├── frontend/                 # React + TypeScript frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API service layer
│   │   ├── types/          # TypeScript type definitions
│   │   ├── utils/          # Utility functions
│   │   └── App.tsx         # Main application component
│   ├── public/             # Static assets
│   ├── index.html          # HTML template
│   ├── package.json        # Dependencies and scripts
│   ├── vite.config.ts      # Vite configuration
│   └── tsconfig.json       # TypeScript configuration
├── backend/                 # Express + TypeScript backend
│   ├── src/
│   │   ├── handlers/       # Lambda/Express route handlers
│   │   ├── services/       # Business logic services
│   │   ├── models/         # Data models and types
│   │   ├── utils/          # Utility functions
│   │   └── index.ts        # Main application entry
│   ├── dist/               # Compiled JavaScript (build output)
│   ├── package.json        # Dependencies and scripts
│   └── tsconfig.json       # TypeScript configuration
├── infrastructure/          # AWS CloudFormation templates
│   └── cloudformation.yaml # Main infrastructure template
├── .github/workflows/       # CI/CD workflows
├── docs/                   # Documentation
└── scripts/                # Deployment and utility scripts
```

## Development Workflow

### 1. Feature Development

```bash
# Start from dev branch
git checkout dev
git pull origin dev

# Create feature branch
git checkout -b feature/your-feature-name

# Make changes...
# Test locally...

# Commit changes
git add .
git commit -m "feat: add your feature description"
git push origin feature/your-feature-name
```

### 2. Testing Changes

#### Backend Testing
```bash
cd backend

# Run unit tests
npm test

# Run with test coverage
npm run test:coverage

# Lint code
npm run lint

# Type checking
npm run type-check
```

#### Frontend Testing
```bash
cd frontend

# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run E2E tests (if configured)
npm run test:e2e

# Lint code
npm run lint

# Type checking
npm run type-check
```

### 3. Integration Testing

Test the full application locally:

1. **Start both servers**
2. **Open http://localhost:5173**
3. **Test quiz functionality:**
   - Load questions from AWS Bedrock
   - Submit answers and get scores
   - Check error handling
   - Verify API key authentication

### 4. Code Quality

#### Pre-commit Checks
```bash
# Format code
npm run format

# Lint and fix issues
npm run lint:fix

# Run all checks
npm run validate
```

#### TypeScript Standards
- Use strict TypeScript configuration
- Define interfaces for all data structures
- Use proper type annotations
- Avoid `any` type when possible

#### Code Style
- Use Prettier for consistent formatting
- Follow ESLint rules for code quality
- Use meaningful variable and function names
- Add JSDoc comments for complex functions

## API Development

### Backend API Structure

```typescript
// Example API endpoint
app.get('/api/questions', async (req, res) => {
  try {
    const questions = await questionService.getQuestions();
    res.json({ success: true, data: questions });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});
```

### Frontend API Integration

```typescript
// API service example
export const apiService = {
  async getQuestions(): Promise<Question[]> {
    const response = await fetch(`${API_URL}/questions`, {
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch questions');
    }
    
    const data = await response.json();
    return data.questions;
  }
};
```

## Database Development

### DynamoDB Local (Optional)

For offline development:

```bash
# Install DynamoDB Local
npm install -g dynamodb-local

# Start local DynamoDB
dynamodb-local

# Use local endpoint in backend
AWS_DYNAMODB_ENDPOINT=http://localhost:8000
```

### Table Structure

```javascript
// Questions table schema
{
  "TableName": "quiz-questions-dev",
  "KeySchema": [
    {
      "AttributeName": "id",
      "KeyType": "HASH"
    }
  ],
  "AttributeDefinitions": [
    {
      "AttributeName": "id",
      "AttributeType": "S"
    }
  ]
}
```

## Environment Variables

### Backend (.env)
```env
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret

# Application Settings
NODE_ENV=development
PORT=3000
API_KEY=dev_api_key_123

# Database
DYNAMODB_TABLE_PREFIX=quiz-dev
DYNAMODB_ENDPOINT=http://localhost:8000  # For local DynamoDB

# External Services
BEDROCK_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-v2

# CORS
CORS_ORIGIN=http://localhost:5173
```

### Frontend (.env.local)
```env
# API Configuration
VITE_API_URL=http://localhost:3000
VITE_API_KEY=dev_api_key_123

# Environment
VITE_ENVIRONMENT=development
VITE_DEBUG=true

# Feature Flags
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG_MODE=true
```

## Debugging

### Backend Debugging

1. **VS Code Launch Configuration** (`.vscode/launch.json`):
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Backend",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/backend/src/index.ts",
      "outFiles": ["${workspaceFolder}/backend/dist/**/*.js"],
      "runtimeArgs": ["-r", "ts-node/register"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  ]
}
```

2. **Console Debugging**:
```bash
cd backend
npm run dev:debug
```

### Frontend Debugging

1. **Browser DevTools**
   - React Developer Tools extension
   - Redux DevTools (if using Redux)
   - Network tab for API calls

2. **VS Code Debugging**
   - Install "Debugger for Chrome" extension
   - Set breakpoints in TypeScript files
   - Use browser console for runtime debugging

## Performance Optimization

### Backend Performance

- Use connection pooling for DynamoDB
- Implement proper caching strategies
- Optimize AWS Bedrock API calls
- Use compression middleware
- Monitor memory usage

### Frontend Performance

- Use React.memo for expensive components
- Implement proper state management
- Optimize bundle size with tree shaking
- Use lazy loading for routes
- Implement proper error boundaries

## Common Development Issues

### Port Conflicts
```bash
# Check what's using port 3000
netstat -ano | findstr :3000

# Kill process if needed
taskkill /F /PID <process_id>
```

### AWS Credentials Issues
```bash
# Verify AWS configuration
aws sts get-caller-identity

# Test AWS access
aws dynamodb list-tables
```

### Node.js Version Issues
```bash
# Use Node Version Manager (nvm)
nvm install 18
nvm use 18
```

### Package Installation Issues
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

- Set up testing framework (Jest, React Testing Library)
- Configure code coverage reporting
- Set up pre-commit hooks with Husky
- Add E2E testing with Playwright or Cypress
- Implement proper logging strategy
- Set up monitoring and alerting
