# Quick Custom Domain Deployment for QuizAxis.com
param(
    [string]$DomainName = "quizaxis.com",
    [string]$Environment = "prod", 
    [string]$Region = "us-east-1"
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting deployment to: $DomainName" -ForegroundColor Green

# Configuration  
$HostedZoneId = "Z03615254M0R4HDKT91U"
$StackName = "quiz-infrastructure-prod"

Write-Host "✅ Using existing hosted zone: $HostedZoneId" -ForegroundColor Green

# Step 1: Check for existing SSL certificate
Write-Host "📜 Step 1: Checking for SSL Certificate..." -ForegroundColor Yellow

$CertificateArn = aws acm list-certificates --region $Region --query "CertificateSummaryList[?DomainName=='$DomainName'].CertificateArn" --output text

if (-not $CertificateArn) {
    Write-Host "🔒 No existing certificate found. Creating new one..." -ForegroundColor Blue
    
    $CertificateArn = aws acm request-certificate `
        --domain-name $DomainName `
        --subject-alternative-names "*.$DomainName" `
        --validation-method DNS `
        --region $Region `
        --query "CertificateArn" `
        --output text
    
    Write-Host "✅ SSL Certificate requested: $CertificateArn" -ForegroundColor Green
    Write-Host "⚠️  IMPORTANT: You need to validate this certificate manually:" -ForegroundColor Red
    Write-Host "   1. Go to AWS Console > Certificate Manager" -ForegroundColor Yellow
    Write-Host "   2. Find your certificate and click on it" -ForegroundColor Yellow  
    Write-Host "   3. Add the CNAME records to your Route 53 hosted zone" -ForegroundColor Yellow
    Write-Host "   4. Wait for validation (5-10 minutes)" -ForegroundColor Yellow
    Write-Host "" -ForegroundColor White
    
    $continue = Read-Host "Press Enter when certificate is validated, or 'skip' to use existing infrastructure"
    if ($continue -eq "skip") {
        Write-Host "⏭️ Skipping certificate creation..." -ForegroundColor Yellow
        exit 0
    }
} else {
    Write-Host "✅ Found existing certificate: $CertificateArn" -ForegroundColor Green
}

# Step 2: Deploy Infrastructure
Write-Host "🏗️ Step 2: Deploying Infrastructure..." -ForegroundColor Yellow

$deployResult = aws cloudformation deploy `
    --template-file infrastructure/cloudformation.yaml `
    --stack-name $StackName `
    --parameter-overrides `
        Environment=$Environment `
        DomainName=$DomainName `
        UseCustomDomain=true `
        SSLCertificateArn=$CertificateArn `
        HostedZoneId=$HostedZoneId `
        EnableAPIKey=true `
        RateLimitBurst=100 `
        RateLimitRate=50 `
    --capabilities CAPABILITY_IAM `
    --region $Region

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Infrastructure deployed successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Infrastructure deployment failed!" -ForegroundColor Red
    Write-Host "Check CloudFormation console for details" -ForegroundColor Yellow
    exit 1
}

# Step 3: Get infrastructure outputs
Write-Host "📊 Step 3: Getting infrastructure outputs..." -ForegroundColor Yellow

$S3Bucket = aws cloudformation describe-stacks --stack-name $StackName --query "Stacks[0].Outputs[?OutputKey=='S3BucketName'].OutputValue" --output text --region $Region
$CloudFrontId = aws cloudformation describe-stacks --stack-name $StackName --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" --output text --region $Region

if (-not $S3Bucket) {
    Write-Host "❌ Could not get S3 bucket name from stack outputs" -ForegroundColor Red
    exit 1
}

Write-Host "✅ S3 Bucket: $S3Bucket" -ForegroundColor Green
Write-Host "✅ CloudFront Distribution: $CloudFrontId" -ForegroundColor Green

# Step 4: Build and deploy frontend
Write-Host "🎨 Step 4: Building and deploying frontend..." -ForegroundColor Yellow

Push-Location frontend
try {
    Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Blue
    npm install
    
    Write-Host "🔧 Setting environment variables..." -ForegroundColor Blue
    $env:REACT_APP_API_URL = "https://api.$DomainName"
    $env:REACT_APP_ENVIRONMENT = "production"
    
    Write-Host "🏗️ Building frontend..." -ForegroundColor Blue
    npm run build
    
    Write-Host "📤 Uploading to S3..." -ForegroundColor Blue
    aws s3 sync build/ s3://$S3Bucket/ --delete --region $Region
    
    if ($CloudFrontId) {
        Write-Host "🔄 Invalidating CloudFront cache..." -ForegroundColor Blue
        aws cloudfront create-invalidation --distribution-id $CloudFrontId --paths "/*" --region $Region
    }
} finally {
    Pop-Location
}

# Step 5: Build and deploy backend
Write-Host "⚙️ Step 5: Building and deploying backend..." -ForegroundColor Yellow

Push-Location backend
try {
    Write-Host "📦 Installing backend dependencies..." -ForegroundColor Blue
    npm install
    
    Write-Host "🏗️ Building backend..." -ForegroundColor Blue  
    npm run build
    
    Write-Host "📦 Creating deployment package..." -ForegroundColor Blue
    if (Test-Path "../backend-deployment.zip") {
        Remove-Item "../backend-deployment.zip" -Force
    }
    Compress-Archive -Path * -DestinationPath ../backend-deployment.zip -Force
} finally {
    Pop-Location
}

Write-Host "🚀 Deploying to Lambda..." -ForegroundColor Blue
$LambdaFunction = aws cloudformation describe-stacks --stack-name $StackName --query "Stacks[0].Outputs[?OutputKey=='LambdaFunctionName'].OutputValue" --output text --region $Region

if ($LambdaFunction) {
    aws lambda update-function-code --function-name $LambdaFunction --zip-file fileb://backend-deployment.zip --region $Region
    Remove-Item backend-deployment.zip -Force
    Write-Host "✅ Backend deployed successfully!" -ForegroundColor Green
} else {
    Write-Host "⚠️ Could not find Lambda function name in stack outputs" -ForegroundColor Yellow
}

Write-Host "🎉 Deployment completed!" -ForegroundColor Green
Write-Host "" -ForegroundColor White
Write-Host "🌐 Your application should be available at:" -ForegroundColor Cyan
Write-Host "   Frontend: https://$DomainName" -ForegroundColor Yellow
Write-Host "   API:      https://api.$DomainName" -ForegroundColor Yellow
Write-Host "" -ForegroundColor White
Write-Host "⏳ Note: DNS propagation may take 5-15 minutes" -ForegroundColor Gray
