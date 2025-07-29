# Custom Domain Deployment Script for QuizAxis.com (PowerShell)
# This script deploys the AWS AI Quiz application to a custom domain

param(
    [string]$DomainName = "quizaxis.com",
    [string]$Environment = "prod",
    [string]$Region = "us-east-1"
)

$ErrorActionPreference = "Stop"

# Configuration
$StackNameRoute53 = "quiz-route53-setup"
$StackNameMain = "quiz-infrastructure-prod"

Write-Host "🚀 Starting deployment to custom domain: $DomainName" -ForegroundColor Green

# Function to check if stack exists
function Test-StackExists {
    param([string]$StackName)
    try {
        aws cloudformation describe-stacks --stack-name $StackName --region $Region --output text > $null 2>&1
        return $true
    }
    catch {
        return $false
    }
}

# Step 1: Deploy Route 53 Hosted Zone and SSL Certificate
Write-Host "📡 Step 1: Setting up Route 53 Hosted Zone and SSL Certificate..." -ForegroundColor Yellow

if (Test-StackExists $StackNameRoute53) {
    Write-Host "Updating existing Route 53 stack..." -ForegroundColor Blue
    aws cloudformation update-stack `
        --stack-name $StackNameRoute53 `
        --template-body file://infrastructure/route53-setup.yaml `
        --parameters ParameterKey=DomainName,ParameterValue=$DomainName `
        --region $Region
} else {
    Write-Host "Creating new Route 53 stack..." -ForegroundColor Blue
    aws cloudformation create-stack `
        --stack-name $StackNameRoute53 `
        --template-body file://infrastructure/route53-setup.yaml `
        --parameters ParameterKey=DomainName,ParameterValue=$DomainName `
        --region $Region
}

Write-Host "⏳ Waiting for Route 53 stack to complete..." -ForegroundColor Yellow
try {
    aws cloudformation wait stack-create-complete --stack-name $StackNameRoute53 --region $Region
    if ($LASTEXITCODE -ne 0) {
        aws cloudformation wait stack-update-complete --stack-name $StackNameRoute53 --region $Region
    }
    Write-Host "✅ Route 53 stack completed successfully" -ForegroundColor Green
}
catch {
    Write-Host "❌ Route 53 stack failed. Checking stack events..." -ForegroundColor Red
    aws cloudformation describe-stack-events --stack-name $StackNameRoute53 --region $Region --query "StackEvents[?ResourceStatus=='CREATE_FAILED' || ResourceStatus=='UPDATE_FAILED'].{Resource:LogicalResourceId,Reason:ResourceStatusReason}" --output table
    exit 1
}

# Get outputs from Route 53 stack
Write-Host "📋 Getting Route 53 stack outputs..." -ForegroundColor Blue
$HostedZoneId = aws cloudformation describe-stacks --stack-name $StackNameRoute53 --region $Region --query "Stacks[0].Outputs[?OutputKey=='HostedZoneId'].OutputValue" --output text
$SSLCertificateArn = aws cloudformation describe-stacks --stack-name $StackNameRoute53 --region $Region --query "Stacks[0].Outputs[?OutputKey=='SSLCertificateArn'].OutputValue" --output text
$NameServers = aws cloudformation describe-stacks --stack-name $StackNameRoute53 --region $Region --query "Stacks[0].Outputs[?OutputKey=='NameServers'].OutputValue" --output text

Write-Host "✅ Route 53 Hosted Zone ID: $HostedZoneId" -ForegroundColor Green
Write-Host "✅ SSL Certificate ARN: $SSLCertificateArn" -ForegroundColor Green

# Show nameserver update instructions
Write-Host ""
Write-Host "🔧 IMPORTANT: Update your domain registrar with these nameservers:" -ForegroundColor Red
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
$NameServers.Split(",") | ForEach-Object { Write-Host "   $($_.Trim())" -ForegroundColor White }
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host ""
Write-Host "⏳ Please update nameservers at your domain registrar now..." -ForegroundColor Yellow
Write-Host "   (This step is required for SSL certificate validation)" -ForegroundColor Gray
Write-Host ""
Read-Host "Press Enter after updating nameservers to continue"

# Step 2: Wait for SSL Certificate Validation
Write-Host "🔐 Step 2: Waiting for SSL certificate validation..." -ForegroundColor Yellow
Write-Host "   This may take 5-10 minutes after nameserver propagation..." -ForegroundColor Gray

$timeout = 1800 # 30 minutes
$interval = 60  # Check every 60 seconds
$elapsed = 0

while ($elapsed -lt $timeout) {
    $certStatus = aws acm describe-certificate --certificate-arn $SSLCertificateArn --region $Region --query "Certificate.Status" --output text 2>$null
    
    if ($certStatus -eq "ISSUED") {
        Write-Host "✅ SSL Certificate validated successfully!" -ForegroundColor Green
        break
    }
    elseif ($certStatus -eq "FAILED") {
        Write-Host "❌ SSL Certificate validation failed!" -ForegroundColor Red
        Write-Host "   Please check that nameservers are updated correctly at your domain registrar." -ForegroundColor Gray
        exit 1
    }
    else {
        Write-Host "⏳ Certificate status: $certStatus - waiting..." -ForegroundColor Yellow
        Start-Sleep $interval
        $elapsed += $interval
    }
}

if ($elapsed -ge $timeout) {
    Write-Host "❌ Timeout waiting for SSL certificate validation" -ForegroundColor Red
    Write-Host "   Please check nameserver configuration and try again later" -ForegroundColor Gray
    exit 1
}

# Step 3: Deploy Main Infrastructure with Custom Domain
Write-Host "🏗️  Step 3: Deploying main infrastructure with custom domain..." -ForegroundColor Yellow

if (Test-StackExists $StackNameMain) {
    Write-Host "Updating existing infrastructure stack..." -ForegroundColor Blue
    aws cloudformation update-stack `
        --stack-name $StackNameMain `
        --template-body file://infrastructure/cloudformation.yaml `
        --parameters `
            ParameterKey=Environment,ParameterValue=$Environment `
            ParameterKey=DomainName,ParameterValue=$DomainName `
            ParameterKey=UseCustomDomain,ParameterValue=true `
            ParameterKey=SSLCertificateArn,ParameterValue=$SSLCertificateArn `
            ParameterKey=HostedZoneId,ParameterValue=$HostedZoneId `
            ParameterKey=EnableAPIKey,ParameterValue=true `
            ParameterKey=RateLimitBurst,ParameterValue=100 `
            ParameterKey=RateLimitRate,ParameterValue=50 `
        --capabilities CAPABILITY_IAM `
        --region $Region
} else {
    Write-Host "Creating new infrastructure stack..." -ForegroundColor Blue
    aws cloudformation create-stack `
        --stack-name $StackNameMain `
        --template-body file://infrastructure/cloudformation.yaml `
        --parameters `
            ParameterKey=Environment,ParameterValue=$Environment `
            ParameterKey=DomainName,ParameterValue=$DomainName `
            ParameterKey=UseCustomDomain,ParameterValue=true `
            ParameterKey=SSLCertificateArn,ParameterValue=$SSLCertificateArn `
            ParameterKey=HostedZoneId,ParameterValue=$HostedZoneId `
            ParameterKey=EnableAPIKey,ParameterValue=true `
            ParameterKey=RateLimitBurst,ParameterValue=100 `
            ParameterKey=RateLimitRate,ParameterValue=50 `
        --capabilities CAPABILITY_IAM `
        --region $Region
}

Write-Host "⏳ Waiting for infrastructure stack to complete..." -ForegroundColor Yellow
try {
    aws cloudformation wait stack-create-complete --stack-name $StackNameMain --region $Region
    if ($LASTEXITCODE -ne 0) {
        aws cloudformation wait stack-update-complete --stack-name $StackNameMain --region $Region
    }
    Write-Host "✅ Infrastructure stack completed successfully" -ForegroundColor Green
}
catch {
    Write-Host "❌ Infrastructure stack failed. Checking stack events..." -ForegroundColor Red
    aws cloudformation describe-stack-events --stack-name $StackNameMain --region $Region --query "StackEvents[?ResourceStatus=='CREATE_FAILED' || ResourceStatus=='UPDATE_FAILED'].{Resource:LogicalResourceId,Reason:ResourceStatusReason}" --output table
    exit 1
}

# Get infrastructure outputs
Write-Host "📋 Getting infrastructure outputs..." -ForegroundColor Blue
$S3Bucket = aws cloudformation describe-stacks --stack-name $StackNameMain --region $Region --query "Stacks[0].Outputs[?OutputKey=='S3BucketName'].OutputValue" --output text
$CloudFrontId = aws cloudformation describe-stacks --stack-name $StackNameMain --region $Region --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" --output text
$ApiGatewayUrl = aws cloudformation describe-stacks --stack-name $StackNameMain --region $Region --query "Stacks[0].Outputs[?OutputKey=='ApiGatewayUrl'].OutputValue" --output text
$ApiKey = aws cloudformation describe-stacks --stack-name $StackNameMain --region $Region --query "Stacks[0].Outputs[?OutputKey=='ApiKey'].OutputValue" --output text

Write-Host "✅ S3 Bucket: $S3Bucket" -ForegroundColor Green
Write-Host "✅ CloudFront Distribution ID: $CloudFrontId" -ForegroundColor Green
Write-Host "✅ API Gateway URL: $ApiGatewayUrl" -ForegroundColor Green

# Step 4: Build and Deploy Frontend
Write-Host "🎨 Step 4: Building and deploying frontend..." -ForegroundColor Yellow

# Install frontend dependencies and build
Write-Host "Installing frontend dependencies..." -ForegroundColor Blue
Set-Location frontend
npm ci

# Create production environment file
Write-Host "Configuring frontend for production..." -ForegroundColor Blue
@"
REACT_APP_API_URL=https://api.$DomainName
REACT_APP_ENVIRONMENT=production
REACT_APP_DOMAIN=$DomainName
"@ | Out-File -FilePath .env.production -Encoding utf8

# Build frontend
Write-Host "Building frontend..." -ForegroundColor Blue
npm run build

# Deploy to S3
Write-Host "Deploying frontend to S3..." -ForegroundColor Blue
aws s3 sync build/ s3://$S3Bucket/ --delete --cache-control "public, max-age=31536000" --exclude "*.html" --exclude "service-worker.js" --exclude "manifest.json"
aws s3 sync build/ s3://$S3Bucket/ --cache-control "public, max-age=0, must-revalidate" --include "*.html" --include "service-worker.js" --include "manifest.json"

# Invalidate CloudFront cache
Write-Host "Invalidating CloudFront cache..." -ForegroundColor Blue
aws cloudfront create-invalidation --distribution-id $CloudFrontId --paths "/*"

Set-Location ..

# Step 5: Deploy Backend
Write-Host "⚡ Step 5: Deploying backend..." -ForegroundColor Yellow

# Install backend dependencies and build
Write-Host "Installing backend dependencies..." -ForegroundColor Blue
Set-Location backend
npm ci
npm run build

# Create deployment package
Write-Host "Creating backend deployment package..." -ForegroundColor Blue
Compress-Archive -Path * -DestinationPath ../backend-deployment.zip -Force

# Deploy to Lambda
Write-Host "Deploying backend to Lambda..." -ForegroundColor Blue
aws lambda update-function-code --function-name "quiz-backend-$Environment" --zip-file fileb://../backend-deployment.zip --region $Region

Set-Location ..

# Clean up deployment package
Remove-Item backend-deployment.zip -Force

Write-Host ""
Write-Host "🎉 Deployment Complete!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green

$WebsiteUrl = "https://$DomainName"
$ApiUrl = "https://api.$DomainName"

Write-Host ""
Write-Host "🌐 Your application is now live at:" -ForegroundColor Green
Write-Host "   Website: $WebsiteUrl" -ForegroundColor White
Write-Host "   API: $ApiUrl" -ForegroundColor White
Write-Host ""
Write-Host "🔑 API Key (store securely): $ApiKey" -ForegroundColor Red
Write-Host ""
Write-Host "⚠️  Security Note: Store the API key securely!" -ForegroundColor Red
Write-Host "🔗 Test your application: $WebsiteUrl" -ForegroundColor Green
Write-Host ""
Write-Host "🛡️  Security Features Enabled:" -ForegroundColor Green
Write-Host "   • API Rate Limiting: 50 req/sec, 100 burst" -ForegroundColor White
Write-Host "   • WAF Protection on both CloudFront and API Gateway" -ForegroundColor White
Write-Host "   • SSL/TLS encryption" -ForegroundColor White
Write-Host "   • API Key authentication" -ForegroundColor White
Write-Host "   • Geographic blocking for high-risk countries" -ForegroundColor White
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
