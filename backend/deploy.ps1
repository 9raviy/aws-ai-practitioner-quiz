# AWS Deployment Script for Quiz Application (PowerShell)
# Usage: .\deploy.ps1 [environment] [region]

param(
    [string]$Environment = "dev",
    [string]$Region = "us-west-2"
)

$ErrorActionPreference = "Stop"

# Configuration
$StackName = "$Environment-quiz-infrastructure"
$S3Bucket = "$Environment-quiz-deployment-bucket-$(Get-Date -Format 'yyyyMMddHHmmss')"

Write-Host "🚀 Starting AWS deployment for environment: $Environment" -ForegroundColor Green
Write-Host "📍 Region: $Region" -ForegroundColor Green

# Check if AWS CLI is configured
try {
    aws sts get-caller-identity --output text | Out-Null
    Write-Host "✅ AWS CLI configured" -ForegroundColor Green
} catch {
    Write-Host "❌ AWS CLI not configured or credentials invalid" -ForegroundColor Red
    exit 1
}

# Check if we're in the backend directory
if (!(Test-Path "package.json")) {
    Write-Host "📁 Moving to backend directory" -ForegroundColor Yellow
    Set-Location backend
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm ci

# Build TypeScript
Write-Host "🔨 Building TypeScript..." -ForegroundColor Yellow
npm run build

# Create deployment package
Write-Host "📦 Creating deployment package..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "dist\deployment" | Out-Null
Copy-Item -Recurse -Force "dist\*" "dist\deployment\"
Copy-Item "package.json" "dist\deployment\"
Copy-Item "package-lock.json" "dist\deployment\"

# Install production dependencies in deployment directory
Set-Location "dist\deployment"
npm ci --production --silent
Set-Location "..\..\"

# Create ZIP file for Lambda
Write-Host "🗜️ Creating Lambda deployment package..." -ForegroundColor Yellow
Set-Location "dist\deployment"
Compress-Archive -Path ".\*" -DestinationPath "..\lambda-deployment.zip" -Force
Set-Location "..\..\"

# Create S3 bucket for deployment artifacts
Write-Host "🪣 Creating S3 deployment bucket..." -ForegroundColor Yellow
try {
    aws s3 mb "s3://$S3Bucket" --region $Region
} catch {
    Write-Host "Bucket may already exist or creation failed" -ForegroundColor Yellow
}

# Upload Lambda package to S3
Write-Host "📤 Uploading Lambda package to S3..." -ForegroundColor Yellow
aws s3 cp "dist\lambda-deployment.zip" "s3://$S3Bucket/lambda-deployment.zip"

# Deploy CloudFormation stack
Write-Host "☁️ Deploying CloudFormation stack..." -ForegroundColor Yellow
aws cloudformation deploy `
    --template-file "..\infrastructure\cloudformation.yaml" `
    --stack-name $StackName `
    --parameter-overrides Environment=$Environment BedrockRegion=$Region `
    --capabilities CAPABILITY_NAMED_IAM `
    --region $Region

# Get stack outputs
Write-Host "📋 Getting deployment information..." -ForegroundColor Yellow
$ApiEndpoint = aws cloudformation describe-stacks `
    --stack-name $StackName `
    --region $Region `
    --query 'Stacks[0].Outputs[?OutputKey==`APIEndpoint`].OutputValue' `
    --output text

$HealthEndpoint = aws cloudformation describe-stacks `
    --stack-name $StackName `
    --region $Region `
    --query 'Stacks[0].Outputs[?OutputKey==`HealthEndpoint`].OutputValue' `
    --output text

$LambdaFunction = aws cloudformation describe-stacks `
    --stack-name $StackName `
    --region $Region `
    --query 'Stacks[0].Outputs[?OutputKey==`LambdaFunctionName`].OutputValue' `
    --output text

# Update Lambda function code
Write-Host "🔄 Updating Lambda function code..." -ForegroundColor Yellow
aws lambda update-function-code `
    --function-name $LambdaFunction `
    --s3-bucket $S3Bucket `
    --s3-key lambda-deployment.zip `
    --region $Region

# Wait for function to be updated
Write-Host "⏳ Waiting for Lambda function to be updated..." -ForegroundColor Yellow
aws lambda wait function-updated `
    --function-name $LambdaFunction `
    --region $Region

# Test the deployment
Write-Host "🧪 Testing deployment..." -ForegroundColor Yellow
try {
    $HealthResponse = Invoke-WebRequest -Uri $HealthEndpoint -Method Get -UseBasicParsing
    if ($HealthResponse.StatusCode -eq 200) {
        Write-Host "✅ Health check passed!" -ForegroundColor Green
    } else {
        Write-Host "❌ Health check failed (HTTP $($HealthResponse.StatusCode))" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Health check failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Clean up
Write-Host "🧹 Cleaning up deployment artifacts..." -ForegroundColor Yellow
Remove-Item -Recurse -Force "dist\deployment" -ErrorAction SilentlyContinue
Remove-Item -Force "dist\lambda-deployment.zip" -ErrorAction SilentlyContinue

# Print summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "🎉 Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Environment: $Environment" -ForegroundColor Green
Write-Host "Region: $Region" -ForegroundColor Green
Write-Host "API Endpoint: $ApiEndpoint" -ForegroundColor Green
Write-Host "Health Endpoint: $HealthEndpoint" -ForegroundColor Green
Write-Host "Lambda Function: $LambdaFunction" -ForegroundColor Green
Write-Host "CloudFormation Stack: $StackName" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

Write-Host ""
Write-Host "🎯 Test your API:" -ForegroundColor Green
Write-Host "Invoke-WebRequest -Uri '$HealthEndpoint' -Method Get"
Write-Host "Invoke-WebRequest -Uri '$ApiEndpoint/api/v1/quiz/start' -Method Post -Headers @{'Content-Type'='application/json'} -Body '{`"difficulty`":`"beginner`"}'"

Write-Host ""
Write-Host "✅ Deployment script completed successfully!" -ForegroundColor Green
