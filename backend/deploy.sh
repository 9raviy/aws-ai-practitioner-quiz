#!/bin/bash

# AWS Deployment Script for Quiz Application
# Usage: ./deploy.sh [environment] [region]

set -e

# Configuration
ENVIRONMENT=${1:-dev}
REGION=${2:-us-west-2}
STACK_NAME="${ENVIRONMENT}-quiz-infrastructure"
S3_BUCKET="${ENVIRONMENT}-quiz-deployment-bucket-$(date +%s)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting AWS deployment for environment: ${ENVIRONMENT}${NC}"
echo -e "${GREEN}📍 Region: ${REGION}${NC}"

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS CLI not configured or credentials invalid${NC}"
    exit 1
fi

echo -e "${GREEN}✅ AWS CLI configured${NC}"

# Check if we're in the backend directory
if [ ! -f "package.json" ]; then
    echo -e "${YELLOW}📁 Moving to backend directory${NC}"
    cd backend
fi

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm ci

# Build TypeScript
echo -e "${YELLOW}🔨 Building TypeScript...${NC}"
npm run build

# Create deployment package
echo -e "${YELLOW}📦 Creating deployment package...${NC}"
mkdir -p dist/deployment
cp -r dist/* dist/deployment/
cp package.json dist/deployment/
cp package-lock.json dist/deployment/

# Install production dependencies in deployment directory
cd dist/deployment
npm ci --production --silent
cd ../..

# Create ZIP file for Lambda
echo -e "${YELLOW}🗜️ Creating Lambda deployment package...${NC}"
cd dist/deployment
zip -r -q ../lambda-deployment.zip .
cd ../..

# Create S3 bucket for deployment artifacts
echo -e "${YELLOW}🪣 Creating S3 deployment bucket...${NC}"
aws s3 mb s3://${S3_BUCKET} --region ${REGION} || echo "Bucket may already exist"

# Upload Lambda package to S3
echo -e "${YELLOW}📤 Uploading Lambda package to S3...${NC}"
aws s3 cp dist/lambda-deployment.zip s3://${S3_BUCKET}/lambda-deployment.zip

# Deploy CloudFormation stack
echo -e "${YELLOW}☁️ Deploying CloudFormation stack...${NC}"
aws cloudformation deploy \
    --template-file ../infrastructure/cloudformation.yaml \
    --stack-name ${STACK_NAME} \
    --parameter-overrides \
        Environment=${ENVIRONMENT} \
        BedrockRegion=${REGION} \
    --capabilities CAPABILITY_NAMED_IAM \
    --region ${REGION}

# Get stack outputs
echo -e "${YELLOW}📋 Getting deployment information...${NC}"
API_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`APIEndpoint`].OutputValue' \
    --output text)

HEALTH_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`HealthEndpoint`].OutputValue' \
    --output text)

LAMBDA_FUNCTION=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`LambdaFunctionName`].OutputValue' \
    --output text)

# Update Lambda function code
echo -e "${YELLOW}🔄 Updating Lambda function code...${NC}"
aws lambda update-function-code \
    --function-name ${LAMBDA_FUNCTION} \
    --s3-bucket ${S3_BUCKET} \
    --s3-key lambda-deployment.zip \
    --region ${REGION}

# Wait for function to be updated
echo -e "${YELLOW}⏳ Waiting for Lambda function to be updated...${NC}"
aws lambda wait function-updated \
    --function-name ${LAMBDA_FUNCTION} \
    --region ${REGION}

# Test the deployment
echo -e "${YELLOW}🧪 Testing deployment...${NC}"
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" ${HEALTH_ENDPOINT} || echo "000")

if [ "${HEALTH_RESPONSE}" = "200" ]; then
    echo -e "${GREEN}✅ Health check passed!${NC}"
else
    echo -e "${RED}❌ Health check failed (HTTP ${HEALTH_RESPONSE})${NC}"
fi

# Clean up
echo -e "${YELLOW}🧹 Cleaning up deployment artifacts...${NC}"
rm -rf dist/deployment
rm -f dist/lambda-deployment.zip

# Print summary
echo -e "${GREEN}"
echo "========================================"
echo "🎉 Deployment Complete!"
echo "========================================"
echo "Environment: ${ENVIRONMENT}"
echo "Region: ${REGION}"
echo "API Endpoint: ${API_ENDPOINT}"
echo "Health Endpoint: ${HEALTH_ENDPOINT}"
echo "Lambda Function: ${LAMBDA_FUNCTION}"
echo "CloudFormation Stack: ${STACK_NAME}"
echo "========================================"
echo -e "${NC}"

echo -e "${GREEN}🎯 Test your API:${NC}"
echo "curl ${HEALTH_ENDPOINT}"
echo "curl -X POST ${API_ENDPOINT}/api/v1/quiz/start -H 'Content-Type: application/json' -d '{\"difficulty\":\"beginner\"}'"

echo -e "${GREEN}✅ Deployment script completed successfully!${NC}"
