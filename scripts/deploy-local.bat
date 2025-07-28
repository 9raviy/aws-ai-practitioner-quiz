@echo off
REM AWS AI Quiz - Local Deployment Script for Windows
REM This script deploys the application locally before pushing to GitHub

setlocal enabledelayedexpansion

REM Configuration
set ENVIRONMENT=%1
if "%ENVIRONMENT%"=="" set ENVIRONMENT=dev
if "%AWS_REGION%"=="" set AWS_REGION=us-east-1
set STACK_NAME=ai-quiz-%ENVIRONMENT%

echo 🚀 Starting local deployment for environment: %ENVIRONMENT%
echo 📍 Region: %AWS_REGION%
echo 📦 Stack: %STACK_NAME%

REM Check AWS CLI
aws --version >nul 2>&1
if errorlevel 1 (
    echo ❌ AWS CLI not found. Please install AWS CLI first.
    exit /b 1
)

REM Check AWS credentials
echo 🔑 Checking AWS credentials...
aws sts get-caller-identity >nul 2>&1
if errorlevel 1 (
    echo ❌ AWS credentials not configured. Run 'aws configure' first.
    exit /b 1
)

echo ✅ AWS credentials configured

REM Step 1: Deploy Infrastructure
echo.
echo 📦 Deploying infrastructure...
cd infrastructure

REM Validate CloudFormation template
echo 🔍 Validating CloudFormation template...
aws cloudformation validate-template --template-body file://cloudformation.yaml
if errorlevel 1 exit /b 1

REM Deploy stack
echo 🚀 Deploying CloudFormation stack...
aws cloudformation deploy ^
    --template-file cloudformation.yaml ^
    --stack-name %STACK_NAME% ^
    --parameter-overrides Environment=%ENVIRONMENT% ^
    --capabilities CAPABILITY_NAMED_IAM ^
    --region %AWS_REGION% ^
    --no-fail-on-empty-changeset

if errorlevel 1 exit /b 1
echo ✅ Infrastructure deployed

REM Get stack outputs
echo 📋 Getting stack outputs...
for /f "tokens=*" %%a in ('aws cloudformation describe-stacks --stack-name %STACK_NAME% --query "Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue" --output text --region %AWS_REGION%') do set API_URL=%%a
for /f "tokens=*" %%a in ('aws cloudformation describe-stacks --stack-name %STACK_NAME% --query "Stacks[0].Outputs[?OutputKey==`LambdaFunctionName`].OutputValue" --output text --region %AWS_REGION%') do set FUNCTION_NAME=%%a
for /f "tokens=*" %%a in ('aws cloudformation describe-stacks --stack-name %STACK_NAME% --query "Stacks[0].Outputs[?OutputKey==`DynamoDBTableName`].OutputValue" --output text --region %AWS_REGION%') do set TABLE_NAME=%%a

echo 🔗 API URL: %API_URL%
echo 🔧 Function Name: %FUNCTION_NAME%
echo 🗃️ Table Name: %TABLE_NAME%

REM Step 2: Deploy Backend
echo.
echo 🛠️ Building and deploying backend...
cd ..\backend

REM Install dependencies
echo 📦 Installing backend dependencies...
npm ci
if errorlevel 1 exit /b 1

REM Build backend
echo 🔨 Building backend...
npm run build
if errorlevel 1 exit /b 1

REM Create deployment package
echo 📦 Creating deployment package...
if exist lambda-deploy rmdir /s /q lambda-deploy
mkdir lambda-deploy

REM Copy built files
xcopy /s dist\* lambda-deploy\
copy package.json lambda-deploy\
copy package-lock.json lambda-deploy\

REM Install production dependencies
cd lambda-deploy
npm ci --only=production
if errorlevel 1 exit /b 1

REM Create ZIP (requires PowerShell)
powershell -command "Compress-Archive -Path .\* -DestinationPath ..\backend-deployment.zip -Force"
cd ..

REM Deploy to Lambda
echo 🚀 Deploying to Lambda...
aws lambda update-function-code ^
    --function-name %FUNCTION_NAME% ^
    --zip-file fileb://backend-deployment.zip ^
    --region %AWS_REGION%

if errorlevel 1 exit /b 1

REM Update environment variables
aws lambda update-function-configuration ^
    --function-name %FUNCTION_NAME% ^
    --environment Variables="{NODE_ENV=production,DYNAMODB_TABLE_NAME=%TABLE_NAME%,BEDROCK_REGION=%AWS_REGION%}" ^
    --region %AWS_REGION%

REM Wait for deployment
echo ⏳ Waiting for deployment to complete...
aws lambda wait function-updated ^
    --function-name %FUNCTION_NAME% ^
    --region %AWS_REGION%

echo ✅ Backend deployed

REM Test Lambda
echo 🧪 Testing Lambda function...
aws lambda invoke ^
    --function-name %FUNCTION_NAME% ^
    --payload "{\"httpMethod\":\"GET\",\"path\":\"/api/v1/health\",\"headers\":{\"Content-Type\":\"application/json\"}}" ^
    --region %AWS_REGION% ^
    test-response.json

echo 📄 Lambda test response:
type test-response.json
echo.

REM Step 3: Deploy Frontend
echo.
echo 🎨 Building and deploying frontend...
cd ..\frontend

REM Create environment file
echo ⚙️ Creating environment configuration...
echo VITE_API_URL=%API_URL% > .env.production
echo VITE_ENVIRONMENT=%ENVIRONMENT% >> .env.production

REM Install dependencies
echo 📦 Installing frontend dependencies...
npm ci
if errorlevel 1 exit /b 1

REM Build frontend
echo 🔨 Building frontend...
npm run build
if errorlevel 1 exit /b 1

REM Create S3 bucket for frontend
for /f %%a in ('powershell -command "Get-Date -UFormat %%s"') do set TIMESTAMP=%%a
set BUCKET_NAME=ai-quiz-frontend-%ENVIRONMENT%-%TIMESTAMP:~0,10%
echo 🪣 Creating S3 bucket: %BUCKET_NAME%

aws s3 mb s3://%BUCKET_NAME% --region %AWS_REGION%
if errorlevel 1 exit /b 1

REM Configure static website hosting
aws s3 website s3://%BUCKET_NAME% ^
    --index-document index.html ^
    --error-document index.html

REM Create bucket policy
echo { > ..\bucket-policy.json
echo   "Version": "2012-10-17", >> ..\bucket-policy.json
echo   "Statement": [ >> ..\bucket-policy.json
echo     { >> ..\bucket-policy.json
echo       "Sid": "PublicReadGetObject", >> ..\bucket-policy.json
echo       "Effect": "Allow", >> ..\bucket-policy.json
echo       "Principal": "*", >> ..\bucket-policy.json
echo       "Action": "s3:GetObject", >> ..\bucket-policy.json
echo       "Resource": "arn:aws:s3:::%BUCKET_NAME%/*" >> ..\bucket-policy.json
echo     } >> ..\bucket-policy.json
echo   ] >> ..\bucket-policy.json
echo } >> ..\bucket-policy.json

aws s3api put-bucket-policy ^
    --bucket %BUCKET_NAME% ^
    --policy file://..\bucket-policy.json

REM Deploy to S3
echo 🚀 Deploying to S3...
aws s3 sync dist\ s3://%BUCKET_NAME% ^
    --delete ^
    --region %AWS_REGION%

if errorlevel 1 exit /b 1

set WEBSITE_URL=http://%BUCKET_NAME%.s3-website-%AWS_REGION%.amazonaws.com

echo ✅ Frontend deployed

REM Final Testing
echo.
echo 🧪 Running final tests...
echo 🔍 Testing API health endpoint...
timeout /t 5 >nul
curl -s %API_URL%/api/v1/health

echo 🔍 Testing website...
timeout /t 10 >nul
for /f %%a in ('curl -s -o nul -w "%%{http_code}" %WEBSITE_URL%') do set HTTP_STATUS=%%a
echo Website HTTP status: %HTTP_STATUS%

REM Deployment Summary
echo.
echo 🎉 Deployment Complete!
echo ==========================================
echo Environment: %ENVIRONMENT%
echo Region: %AWS_REGION%
echo API URL: %API_URL%
echo Website URL: %WEBSITE_URL%
echo ==========================================
echo.
echo 🚀 Next Steps:
echo 1. Test the complete quiz flow at: %WEBSITE_URL%
echo 2. Monitor CloudWatch logs for any issues
echo 3. Commit your changes and push to GitHub
echo 4. Set up GitHub secrets for automated deployment

REM Save deployment info
cd ..
if not exist deployment-info mkdir deployment-info
echo { > deployment-info\local-deployment-%ENVIRONMENT%.json
echo   "environment": "%ENVIRONMENT%", >> deployment-info\local-deployment-%ENVIRONMENT%.json
echo   "region": "%AWS_REGION%", >> deployment-info\local-deployment-%ENVIRONMENT%.json
echo   "apiUrl": "%API_URL%", >> deployment-info\local-deployment-%ENVIRONMENT%.json
echo   "websiteUrl": "%WEBSITE_URL%", >> deployment-info\local-deployment-%ENVIRONMENT%.json
echo   "functionName": "%FUNCTION_NAME%", >> deployment-info\local-deployment-%ENVIRONMENT%.json
echo   "tableName": "%TABLE_NAME%", >> deployment-info\local-deployment-%ENVIRONMENT%.json
echo   "bucketName": "%BUCKET_NAME%", >> deployment-info\local-deployment-%ENVIRONMENT%.json
echo   "deployedAt": "%date:~10,4%-%date:~4,2%-%date:~7,2%T%time:~0,2%:%time:~3,2%:%time:~6,2%Z", >> deployment-info\local-deployment-%ENVIRONMENT%.json
echo   "deployedBy": "local-script" >> deployment-info\local-deployment-%ENVIRONMENT%.json
echo } >> deployment-info\local-deployment-%ENVIRONMENT%.json

echo 💾 Deployment info saved to: deployment-info\local-deployment-%ENVIRONMENT%.json

pause
