#!/usr/bin/env powershell
# AWS Bedrock Setup Verification Script

Write-Host "🔍 AWS Bedrock Setup Verification" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host ""

# Test 1: AWS CLI Installation
Write-Host "Test 1: Checking AWS CLI installation..." -ForegroundColor Yellow
try {
    $awsVersion = aws --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ AWS CLI installed: $awsVersion" -ForegroundColor Green
    } else {
        Write-Host "❌ AWS CLI not found. Please install AWS CLI first." -ForegroundColor Red
        Write-Host "   Download from: https://awscli.amazonaws.com/AWSCLIV2.msi" -ForegroundColor Cyan
        exit 1
    }
} catch {
    Write-Host "❌ AWS CLI not found. Please install AWS CLI first." -ForegroundColor Red
    exit 1
}

Write-Host ""

# Test 2: AWS Credentials
Write-Host "Test 2: Checking AWS credentials..." -ForegroundColor Yellow
try {
    $identity = aws sts get-caller-identity --output json 2>&1
    if ($LASTEXITCODE -eq 0) {
        $identityObj = $identity | ConvertFrom-Json
        Write-Host "✅ AWS credentials configured" -ForegroundColor Green
        Write-Host "   Account: $($identityObj.Account)" -ForegroundColor Cyan
        Write-Host "   User/Role: $($identityObj.Arn)" -ForegroundColor Cyan
    } else {
        Write-Host "❌ AWS credentials not configured" -ForegroundColor Red
        Write-Host "   Run: aws configure" -ForegroundColor Cyan
        exit 1
    }
} catch {
    Write-Host "❌ AWS credentials not configured" -ForegroundColor Red
    Write-Host "   Run: aws configure" -ForegroundColor Cyan
    exit 1
}

Write-Host ""

# Test 3: Bedrock Service Access
Write-Host "Test 3: Checking Bedrock service access..." -ForegroundColor Yellow
try {
    $models = aws bedrock list-foundation-models --region us-west-2 --output json 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Bedrock service accessible" -ForegroundColor Green
        
        # Check for Claude 3.5 Sonnet specifically
        $modelsObj = $models | ConvertFrom-Json
        $claudeModel = $modelsObj.modelSummaries | Where-Object { $_.modelId -like "*claude-3-5-sonnet*" }
        
        if ($claudeModel) {
            Write-Host "✅ Claude 3.5 Sonnet model found: $($claudeModel.modelId)" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Claude 3.5 Sonnet model not found" -ForegroundColor Yellow
            Write-Host "   Please enable model access in AWS Bedrock console" -ForegroundColor Cyan
        }
    } else {
        Write-Host "❌ Cannot access Bedrock service" -ForegroundColor Red
        Write-Host "   Error: $models" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Cannot access Bedrock service" -ForegroundColor Red
    Write-Host "   Check IAM permissions for Bedrock" -ForegroundColor Cyan
    exit 1
}

Write-Host ""

# Test 4: Region Configuration
Write-Host "Test 4: Checking region configuration..." -ForegroundColor Yellow
try {
    $region = aws configure get region
    if ($region -eq "us-west-2") {
        Write-Host "✅ Region correctly set to us-west-2" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Region is set to: $region" -ForegroundColor Yellow
        Write-Host "   Recommended: us-west-2 for Bedrock" -ForegroundColor Cyan
    }
} catch {
    Write-Host "⚠️  Could not determine region configuration" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Setup verification complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. If all tests passed, run: npm run test:bedrock" -ForegroundColor Cyan
Write-Host "2. If any tests failed, follow the AWS_SETUP_INSTRUCTIONS.md guide" -ForegroundColor Cyan
Write-Host ""
