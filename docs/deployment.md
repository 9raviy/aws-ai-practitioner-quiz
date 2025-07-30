# Deployment Guide

## Overview

This project uses a branch-based CI/CD workflow with two environments:

- **Development** (`dev` branch) - For testing and development
- **Production** (`main` branch) - Live application at quizaxis.com

## Branch Strategy

### Development Branch (`dev`)
- Used for active development and testing
- Automatically deploys to development environment on push
- Pull requests should be created from feature branches to `dev`
- Test all changes here before promoting to production

### Production Branch (`main`)
- Contains stable, production-ready code
- Automatically deploys to production at quizaxis.com on push
- Should only receive commits via pull requests from `dev`
- Protected branch with required reviews

## Deployment Workflows

### 1. Development Deployment (`deploy-complete.yml`)

**Triggers:**
- Push to `dev` branch
- Pull requests to `main` branch (for validation)
- Manual dispatch

**Environment:** Development
**Domain:** Development API Gateway endpoint
**Purpose:** Test changes before production

### 2. Production Deployment (`deploy-production.yml`)

**Triggers:**
- Push to `main` branch
- Manual dispatch with options

**Environment:** Production
**Domain:** quizaxis.com (custom domain)
**Purpose:** Live application for end users

### 3. Infrastructure Only (`deploy-infrastructure.yml`)

**Triggers:**
- Manual dispatch only

**Purpose:** Deploy infrastructure changes without code updates

## Workflow Steps

### Standard Development Flow

1. **Create Feature Branch**
   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b feature/your-feature-name
   ```

2. **Develop and Test Locally**
   ```bash
   # Backend development
   cd backend
   npm install
   npm run dev

   # Frontend development  
   cd frontend
   npm install
   npm run dev
   ```

3. **Commit and Push Feature**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   git push origin feature/your-feature-name
   ```

4. **Create Pull Request to Dev**
   - Create PR from `feature/your-feature-name` to `dev`
   - Review and merge after approval
   - This triggers automatic deployment to development

5. **Test in Development Environment**
   - Verify functionality in development deployment
   - Test API endpoints and frontend integration
   - Check logs and monitoring

6. **Promote to Production**
   - Create PR from `dev` to `main`
   - Thorough review required (protected branch)
   - Merge triggers automatic production deployment

### Hotfix Flow

For urgent production fixes:

1. **Create Hotfix Branch from Main**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b hotfix/issue-description
   ```

2. **Make Minimal Fix**
   ```bash
   # Make necessary changes
   git add .
   git commit -m "fix: urgent issue description"
   git push origin hotfix/issue-description
   ```

3. **Deploy to Production**
   - Create PR from `hotfix/issue-description` to `main`
   - Fast-track review and merge
   - Automatic production deployment

4. **Sync Back to Dev**
   - Create PR from `main` to `dev` to sync the fix
   - Merge to keep branches in sync

## Manual Deployment

### Prerequisites

1. **AWS CLI Configuration**
   ```bash
   aws configure
   # Enter your AWS Access Key ID, Secret, Region (us-east-1)
   ```

2. **Required Environment Variables**
   ```bash
   AWS_ACCESS_KEY_ID=your_access_key
   AWS_SECRET_ACCESS_KEY=your_secret_key
   AWS_REGION=us-east-1
   ```

### Manual Deployment Commands

1. **Infrastructure Only**
   ```bash
   # Deploy/update CloudFormation stack
   aws cloudformation deploy \
     --template-file infrastructure/cloudformation.yaml \
     --stack-name quiz-infrastructure-prod \
     --parameter-overrides file://cloudformation-params.json \
     --capabilities CAPABILITY_IAM
   ```

2. **Backend Deployment**
   ```bash
   cd backend
   npm ci --production
   zip -r ../backend-deployment.zip . -x "node_modules/.cache/*" "*.log"
   
   aws lambda update-function-code \
     --function-name QuizAppFunction \
     --zip-file fileb://../backend-deployment.zip
   ```

3. **Frontend Deployment**
   ```bash
   cd frontend
   npm ci
   npm run build
   
   aws s3 sync dist/ s3://quiz-app-frontend-bucket --delete
   aws cloudfront create-invalidation \
     --distribution-id YOUR_DISTRIBUTION_ID \
     --paths "/*"
   ```

## Environment Configuration

### Development Environment

- **API Base URL:** AWS API Gateway endpoint
- **DynamoDB Tables:** Development tables (separate from production)
- **Frontend Build:** Development configuration
- **Logging:** Debug level enabled

### Production Environment

- **Custom Domain:** quizaxis.com
- **SSL Certificate:** AWS Certificate Manager (ACM)
- **CDN:** CloudFront distribution
- **WAF:** Web Application Firewall enabled
- **Rate Limiting:** API Gateway throttling
- **Monitoring:** CloudWatch logs and metrics

## Rollback Procedures

### Automatic Rollback

GitHub Actions includes automatic rollback on deployment failure:
- CloudFormation stack rollback on template errors
- Lambda function version rollback on deployment failure
- S3/CloudFront rollback using previous deployment artifacts

### Manual Rollback

1. **Identify Last Known Good Commit**
   ```bash
   git log --oneline main
   ```

2. **Revert to Previous Version**
   ```bash
   # Option 1: Revert specific commit
   git revert <commit-hash>
   git push origin main

   # Option 2: Reset to previous commit (destructive)
   git reset --hard <commit-hash>
   git push --force-with-lease origin main
   ```

3. **Emergency Manual Deployment**
   ```bash
   # Deploy known good version manually
   git checkout <good-commit-hash>
   # Run manual deployment commands above
   ```

## Monitoring and Validation

### Post-Deployment Checks

1. **Health Check**
   ```bash
   curl https://api.quizaxis.com/health
   ```

2. **Frontend Validation**
   - Open https://quizaxis.com
   - Test quiz functionality
   - Check console for errors

3. **API Validation**
   ```bash
   curl -H "x-api-key: YOUR_API_KEY" https://api.quizaxis.com/questions
   ```

### Monitoring Tools

- **CloudWatch Logs:** Lambda function logs
- **CloudWatch Metrics:** API Gateway metrics
- **CloudFront Metrics:** CDN performance
- **Route 53 Health Checks:** Domain availability
- **AWS X-Ray:** Request tracing (if enabled)

## Troubleshooting

See [troubleshooting.md](troubleshooting.md) for common deployment issues and solutions.

## Security Considerations

- All deployments use IAM roles with least privilege
- API keys are managed through AWS Secrets Manager
- SSL/TLS termination at CloudFront and API Gateway
- WAF rules protect against common attacks
- Rate limiting prevents abuse

## Cost Optimization

- Development environment can be shut down outside business hours
- CloudFront caching reduces origin requests
- Lambda functions use appropriate memory settings
- DynamoDB uses on-demand billing for predictable costs
