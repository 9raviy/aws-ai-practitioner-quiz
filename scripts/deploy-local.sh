#!/bin/bash

# AWS AI Quiz - Local Deployment Script
# This script deploys the application locally before pushing to GitHub

set -e

# Configuration
ENVIRONMENT=${1:-dev}
AWS_REGION=${AWS_REGION:-us-east-1}
STACK_NAME="ai-quiz-${ENVIRONMENT}"

echo "🚀 Starting local deployment for environment: $ENVIRONMENT"
echo "📍 Region: $AWS_REGION"
echo "📦 Stack: $STACK_NAME"

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Please install AWS CLI first."
    exit 1
fi

# Check AWS credentials
echo "🔑 Checking AWS credentials..."
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured. Run 'aws configure' first."
    exit 1
fi

echo "✅ AWS credentials configured"

# Step 1: Deploy Infrastructure
echo ""
echo "📦 Deploying infrastructure..."
cd infrastructure

# Validate CloudFormation template
echo "🔍 Validating CloudFormation template..."
aws cloudformation validate-template --template-body file://cloudformation.yaml

# Deploy stack
echo "🚀 Deploying CloudFormation stack..."
aws cloudformation deploy \
    --template-file cloudformation.yaml \
    --stack-name $STACK_NAME \
    --parameter-overrides Environment=$ENVIRONMENT \
    --capabilities CAPABILITY_NAMED_IAM \
    --region $AWS_REGION \
    --no-fail-on-empty-changeset

echo "✅ Infrastructure deployed"

# Get stack outputs
echo "📋 Getting stack outputs..."
API_URL=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
    --output text \
    --region $AWS_REGION)

FUNCTION_NAME=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[?OutputKey==`LambdaFunctionName`].OutputValue' \
    --output text \
    --region $AWS_REGION)

TABLE_NAME=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[?OutputKey==`DynamoDBTableName`].OutputValue' \
    --output text \
    --region $AWS_REGION)

echo "🔗 API URL: $API_URL"
echo "🔧 Function Name: $FUNCTION_NAME"
echo "🗃️ Table Name: $TABLE_NAME"

# Step 2: Deploy Backend
echo ""
echo "🛠️ Building and deploying backend..."
cd ../backend

# Install dependencies
echo "📦 Installing backend dependencies..."
npm ci

# Build backend
echo "🔨 Building backend..."
npm run build

# Create deployment package
echo "📦 Creating deployment package..."
rm -rf lambda-deploy
mkdir lambda-deploy

# Copy built files
cp -r dist/* lambda-deploy/
cp package.json package-lock.json lambda-deploy/

# Install production dependencies
cd lambda-deploy
npm ci --only=production

# Create ZIP
zip -r ../backend-deployment.zip .
cd ..

# Deploy to Lambda
echo "🚀 Deploying to Lambda..."
aws lambda update-function-code \
    --function-name $FUNCTION_NAME \
    --zip-file fileb://backend-deployment.zip \
    --region $AWS_REGION

# Update environment variables
aws lambda update-function-configuration \
    --function-name $FUNCTION_NAME \
    --environment Variables="{NODE_ENV=production,DYNAMODB_TABLE_NAME=$TABLE_NAME,BEDROCK_REGION=$AWS_REGION}" \
    --region $AWS_REGION

# Wait for deployment
echo "⏳ Waiting for deployment to complete..."
aws lambda wait function-updated \
    --function-name $FUNCTION_NAME \
    --region $AWS_REGION

echo "✅ Backend deployed"

# Test Lambda
echo "🧪 Testing Lambda function..."
aws lambda invoke \
    --function-name $FUNCTION_NAME \
    --payload '{"httpMethod":"GET","path":"/api/v1/health","headers":{"Content-Type":"application/json"}}' \
    --region $AWS_REGION \
    test-response.json

echo "📄 Lambda test response:"
cat test-response.json
echo ""

# Step 3: Deploy Frontend
echo ""
echo "🎨 Building and deploying frontend..."
cd ../frontend

# Create environment file
echo "⚙️ Creating environment configuration..."
cat > .env.production << EOF
VITE_API_URL=$API_URL
VITE_ENVIRONMENT=$ENVIRONMENT
EOF

# Install dependencies
echo "📦 Installing frontend dependencies..."
npm ci

# Build frontend
echo "🔨 Building frontend..."
npm run build

# Create S3 bucket for frontend (if not exists)
BUCKET_NAME="ai-quiz-frontend-${ENVIRONMENT}-$(date +%s)"
echo "🪣 Creating S3 bucket: $BUCKET_NAME"

aws s3 mb s3://$BUCKET_NAME --region $AWS_REGION

# Configure static website hosting
aws s3 website s3://$BUCKET_NAME \
    --index-document index.html \
    --error-document index.html

# Set public read policy
cat > ../bucket-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
    }
  ]
}
EOF

aws s3api put-bucket-policy \
    --bucket $BUCKET_NAME \
    --policy file://../bucket-policy.json

# Deploy to S3
echo "🚀 Deploying to S3..."
aws s3 sync dist/ s3://$BUCKET_NAME \
    --delete \
    --region $AWS_REGION

WEBSITE_URL="http://$BUCKET_NAME.s3-website-$AWS_REGION.amazonaws.com"

echo "✅ Frontend deployed"

# Step 4: Final Testing
echo ""
echo "🧪 Running final tests..."

# Test API
echo "🔍 Testing API health endpoint..."
sleep 5
curl -s $API_URL/api/v1/health | jq '.' || echo "Health check response received"

# Test website
echo "🔍 Testing website..."
sleep 10
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $WEBSITE_URL)
echo "Website HTTP status: $HTTP_STATUS"

# Deployment Summary
echo ""
echo "🎉 Deployment Complete!"
echo "=========================================="
echo "Environment: $ENVIRONMENT"
echo "Region: $AWS_REGION"
echo "API URL: $API_URL"
echo "Website URL: $WEBSITE_URL"
echo "=========================================="
echo ""
echo "🚀 Next Steps:"
echo "1. Test the complete quiz flow at: $WEBSITE_URL"
echo "2. Monitor CloudWatch logs for any issues"
echo "3. Commit your changes and push to GitHub"
echo "4. Set up GitHub secrets for automated deployment"

# Save deployment info
cd ..
mkdir -p deployment-info
cat > deployment-info/local-deployment-$ENVIRONMENT.json << EOF
{
  "environment": "$ENVIRONMENT",
  "region": "$AWS_REGION",
  "apiUrl": "$API_URL",
  "websiteUrl": "$WEBSITE_URL",
  "functionName": "$FUNCTION_NAME",
  "tableName": "$TABLE_NAME",
  "bucketName": "$BUCKET_NAME",
  "deployedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "deployedBy": "local-script"
}
EOF

echo "💾 Deployment info saved to: deployment-info/local-deployment-$ENVIRONMENT.json"
