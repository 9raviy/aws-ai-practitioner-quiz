# Simplified Custom Domain Deployment for QuizAxis.com
param(
    [string]$DomainName = "quizaxis.com",
    [string]$Environment = "prod",
    [string]$Region = "us-east-1"
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting simplified deployment to: $DomainName" -ForegroundColor Green

# Configuration
$HostedZoneId = "Z03615254M0R4HDKT91U"  # Your existing hosted zone
$StackName = "quiz-infrastructure-prod"

Write-Host "✅ Using existing hosted zone: $HostedZoneId" -ForegroundColor Green

# Step 1: Request SSL Certificate
Write-Host "📜 Step 1: Requesting SSL Certificate..." -ForegroundColor Yellow

# Check if certificate already exists
$ExistingCert = aws acm list-certificates --region $Region --query "CertificateSummaryList[?DomainName=='$DomainName'].CertificateArn" --output text

if ($ExistingCert) {
    Write-Host "✅ SSL Certificate already exists: $ExistingCert" -ForegroundColor Green
    $CertificateArn = $ExistingCert
} else {
    Write-Host "🔒 Requesting new SSL certificate..." -ForegroundColor Blue
    $CertificateArn = aws acm request-certificate `
        --domain-name $DomainName `
        --subject-alternative-names "*.$DomainName" `
        --validation-method DNS `
        --region $Region `
        --query "CertificateArn" `
        --output text

    Write-Host "✅ SSL Certificate requested: $CertificateArn" -ForegroundColor Green
    
    Write-Host "⏳ Waiting for DNS validation records to be available..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    
    # Get DNS validation records
    Write-Host "📋 Getting DNS validation records..." -ForegroundColor Blue
    $CertDetails = aws acm describe-certificate --certificate-arn $CertificateArn --region $Region --output json | ConvertFrom-Json
    
    Write-Host "📝 DNS Validation Records needed:" -ForegroundColor Yellow
    foreach ($validation in $CertDetails.Certificate.DomainValidationOptions) {
        if ($validation.ResourceRecord) {
            Write-Host "Domain: $($validation.DomainName)" -ForegroundColor Cyan
            Write-Host "Record Name: $($validation.ResourceRecord.Name)" -ForegroundColor Cyan
            Write-Host "Record Value: $($validation.ResourceRecord.Value)" -ForegroundColor Cyan
            Write-Host "Record Type: $($validation.ResourceRecord.Type)" -ForegroundColor Cyan
            Write-Host "---" -ForegroundColor Gray
            
            # Create change batch file for Route53
            $ChangeBatch = @"
{
    "Changes": [
        {
            "Action": "CREATE",
            "ResourceRecordSet": {
                "Name": "$($validation.ResourceRecord.Name)",
                "Type": "$($validation.ResourceRecord.Type)",
                "TTL": 300,
                "ResourceRecords": [
                    {
                        "Value": "$($validation.ResourceRecord.Value)"
                    }
                ]
            }
        }
    ]
}
"@
            
            Write-Host "🔧 Creating DNS validation record..." -ForegroundColor Blue
            $ChangeBatch | Out-File -FilePath "change-batch.json" -Encoding UTF8
            aws route53 change-resource-record-sets --hosted-zone-id $HostedZoneId --change-batch file://change-batch.json
            Remove-Item "change-batch.json" -Force
        }
    }
    
    Write-Host "⏳ Waiting for certificate validation (this may take 5-10 minutes)..." -ForegroundColor Yellow
    aws acm wait certificate-validated --certificate-arn $CertificateArn --region $Region
    Write-Host "✅ Certificate validated successfully!" -ForegroundColor Green
}

# Step 2: Deploy Infrastructure
Write-Host "🏗️ Step 2: Deploying Infrastructure..." -ForegroundColor Yellow

aws cloudformation deploy `
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
    exit 1
}

# Step 3: Get outputs and deploy application
Write-Host "📊 Step 3: Getting infrastructure outputs..." -ForegroundColor Yellow

$S3Bucket = aws cloudformation describe-stacks --stack-name $StackName --query "Stacks[0].Outputs[?OutputKey=='S3BucketName'].OutputValue" --output text --region $Region
$CloudFrontId = aws cloudformation describe-stacks --stack-name $StackName --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" --output text --region $Region

Write-Host "✅ S3 Bucket: $S3Bucket" -ForegroundColor Green
Write-Host "✅ CloudFront Distribution: $CloudFrontId" -ForegroundColor Green

# Step 4: Build and deploy frontend
Write-Host "🎨 Step 4: Building and deploying frontend..." -ForegroundColor Yellow

Set-Location frontend
npm install

# Set environment variables for production build
$env:REACT_APP_API_URL = "https://api.$DomainName"
$env:REACT_APP_ENVIRONMENT = "production"

npm run build

Write-Host "📤 Uploading to S3..." -ForegroundColor Blue
aws s3 sync build/ s3://$S3Bucket/ --delete --region $Region

Write-Host "🔄 Invalidating CloudFront cache..." -ForegroundColor Blue
aws cloudfront create-invalidation --distribution-id $CloudFrontId --paths "/*" --region $Region

Set-Location ..

# Step 5: Build and deploy backend
Write-Host "⚙️ Step 5: Building and deploying backend..." -ForegroundColor Yellow

Set-Location backend
npm install
npm run build

Write-Host "📦 Packaging backend..." -ForegroundColor Blue
if (Test-Path "../backend-deployment.zip") {
    Remove-Item "../backend-deployment.zip" -Force
}
Compress-Archive -Path * -DestinationPath ../backend-deployment.zip -Force

Set-Location ..

Write-Host "🚀 Deploying to Lambda..." -ForegroundColor Blue
$LambdaFunction = aws cloudformation describe-stacks --stack-name $StackName --query "Stacks[0].Outputs[?OutputKey=='LambdaFunctionName'].OutputValue" --output text --region $Region
aws lambda update-function-code --function-name $LambdaFunction --zip-file fileb://backend-deployment.zip --region $Region

Remove-Item backend-deployment.zip -Force

Write-Host "🎉 Deployment completed successfully!" -ForegroundColor Green
Write-Host "" -ForegroundColor White
Write-Host "🌐 Your application is now available at:" -ForegroundColor Cyan
Write-Host "   Frontend: https://$DomainName" -ForegroundColor Yellow
Write-Host "   API:      https://api.$DomainName" -ForegroundColor Yellow
Write-Host "" -ForegroundColor White
Write-Host "⏳ Note: DNS propagation may take 5-15 minutes" -ForegroundColor Gray
