# AWS Setup Guide

## Overview

This guide covers the complete AWS account setup required for the AWS AI Practitioner Quiz application, including permissions, services, and initial configuration.

## Prerequisites

- AWS Account (free tier eligible)
- Credit card for AWS account verification
- Basic understanding of AWS concepts

## AWS Account Setup

### 1. Create AWS Account

1. **Go to AWS Console**: https://aws.amazon.com/
2. **Click "Create an AWS Account"**
3. **Fill in account details:**
   - Email address
   - Password
   - AWS account name (e.g., "QuizAxis Development")
4. **Contact Information:**
   - Account type: Personal or Business
   - Phone number for verification
   - Address information
5. **Payment Information:**
   - Credit card details (required even for free tier)
6. **Identity Verification:**
   - Phone verification with PIN
7. **Choose Support Plan:**
   - Basic (Free) is sufficient for development

### 2. Secure Root Account

1. **Enable MFA (Multi-Factor Authentication)**
   - AWS Console → IAM → Root Account MFA
   - Use authenticator app (Google Authenticator, Authy)

2. **Create Root Access Keys** (Not Recommended for Daily Use)
   - Only for initial setup
   - Delete after creating IAM users

## IAM Setup

### 1. Create IAM User for Development

1. **Navigate to IAM Console**
   - AWS Console → IAM → Users → Add User

2. **User Details:**
   - Username: `quiz-app-developer`
   - Access type: ✅ Programmatic access, ✅ AWS Management Console access
   - Console password: Auto-generated or custom
   - Require password reset: ✅ (recommended)

3. **Set Permissions:**
   - Attach existing policies directly
   - Add the following policies:

#### Required IAM Policies

**Development Environment (Broad Permissions):**
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "cloudformation:*",
                "lambda:*",
                "s3:*",
                "dynamodb:*",
                "apigateway:*",
                "cloudfront:*",
                "route53:*",
                "acm:*",
                "wafv2:*",
                "logs:*",
                "iam:PassRole",
                "iam:GetRole",
                "iam:CreateRole",
                "iam:DeleteRole",
                "iam:AttachRolePolicy",
                "iam:DetachRolePolicy",
                "iam:PutRolePolicy",
                "iam:DeleteRolePolicy",
                "bedrock:*"
            ],
            "Resource": "*"
        }
    ]
}
```

**Production Environment (Restricted):**
For production, use more restrictive policies:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "lambda:UpdateFunctionCode",
                "lambda:GetFunction",
                "lambda:InvokeFunction",
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket",
                "cloudfront:CreateInvalidation",
                "cloudfront:GetDistribution",
                "dynamodb:GetItem",
                "dynamodb:PutItem",
                "dynamodb:UpdateItem",
                "dynamodb:DeleteItem",
                "dynamodb:Query",
                "dynamodb:Scan",
                "bedrock:InvokeModel"
            ],
            "Resource": [
                "arn:aws:lambda:us-east-1:*:function:QuizApp*",
                "arn:aws:s3:::quiz-app-*",
                "arn:aws:s3:::quiz-app-*/*",
                "arn:aws:cloudfront::*:distribution/*",
                "arn:aws:dynamodb:us-east-1:*:table/quiz-*",
                "arn:aws:bedrock:us-east-1::foundation-model/*"
            ]
        }
    ]
}
```

### 2. Create Service Roles

#### Lambda Execution Role

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents"
            ],
            "Resource": "arn:aws:logs:*:*:*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "dynamodb:GetItem",
                "dynamodb:PutItem",
                "dynamodb:UpdateItem",
                "dynamodb:DeleteItem",
                "dynamodb:Query",
                "dynamodb:Scan"
            ],
            "Resource": "arn:aws:dynamodb:us-east-1:*:table/quiz-*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "bedrock:InvokeModel"
            ],
            "Resource": "*"
        }
    ]
}
```

## AWS CLI Configuration

### 1. Install AWS CLI

**Windows:**
```powershell
# Using winget
winget install Amazon.AWSCLI

# Or download installer from AWS website
```

**macOS:**
```bash
# Using Homebrew
brew install awscli

# Or using pip
pip install awscli
```

**Linux:**
```bash
# Using package manager (Ubuntu/Debian)
sudo apt update
sudo apt install awscli

# Or using pip
pip install awscli
```

### 2. Configure AWS CLI

```bash
aws configure
```

**Enter the following:**
- AWS Access Key ID: `[Your IAM user access key]`
- AWS Secret Access Key: `[Your IAM user secret key]`
- Default region name: `us-east-1`
- Default output format: `json`

### 3. Test Configuration

```bash
# Test basic connectivity
aws sts get-caller-identity

# Should return:
{
    "UserId": "AIDACKCEVSQ6C2EXAMPLE",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/quiz-app-developer"
}
```

## AWS Services Setup

### 1. Enable Required Services

Some services need to be explicitly enabled:

#### AWS Bedrock
```bash
# Check available models
aws bedrock list-foundation-models --region us-east-1

# Request access to Anthropic Claude (if needed)
# This may require manual approval through AWS Console
```

#### Route 53 (For Custom Domain)
- No special setup required
- Charges apply for hosted zones ($0.50/month per zone)

### 2. Region Configuration

**Primary Region:** `us-east-1` (N. Virginia)
- Required for Certificate Manager (ACM) with CloudFront
- Most AWS services available
- Generally lowest latency for global distribution

**Alternative Regions** (if needed):
- `us-west-2` (Oregon)
- `eu-west-1` (Ireland)

### 3. Service Limits and Quotas

Check default limits for key services:

```bash
# Lambda limits
aws service-quotas get-service-quota \
  --service-code lambda \
  --quota-code L-B99A9384

# DynamoDB limits
aws service-quotas get-service-quota \
  --service-code dynamodb \
  --quota-code L-F98FE922

# API Gateway limits
aws service-quotas get-service-quota \
  --service-code apigateway \
  --quota-code L-8A5B8E43
```

## Domain Configuration (Optional)

### 1. Register Domain

If you don't have a domain:

1. **Route 53 Domain Registration:**
   - AWS Console → Route 53 → Domain Registration
   - Search for available domain
   - Complete registration process

2. **External Domain Provider:**
   - Register domain with provider of choice
   - Point nameservers to Route 53 (if using Route 53 for DNS)

### 2. Create Hosted Zone

```bash
# Create hosted zone
aws route53 create-hosted-zone \
  --name quizaxis.com \
  --caller-reference $(date +%s)

# Note the nameservers from output
# Update domain nameservers if registered externally
```

### 3. Request SSL Certificate

```bash
# Request certificate for domain and subdomain
aws acm request-certificate \
  --domain-name quizaxis.com \
  --subject-alternative-names "*.quizaxis.com" \
  --validation-method DNS \
  --region us-east-1
```

## Cost Management

### 1. Set Up Billing Alerts

1. **Enable Billing Alerts:**
   - AWS Console → Billing → Preferences
   - ✅ Receive Billing Alerts

2. **Create CloudWatch Billing Alarm:**
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name "Monthly-Bill-Exceeds-10-USD" \
  --alarm-description "Alarm when monthly bill exceeds $10" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 86400 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=Currency,Value=USD \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT-ID:billing-alarm
```

### 2. Free Tier Monitoring

Monitor free tier usage:
- AWS Console → Billing → Free Tier
- Set up notifications for approaching limits

### 3. Cost Estimation

**Development Environment (Monthly):**
- DynamoDB: $0-5 (on-demand)
- Lambda: $0-2 (free tier: 1M requests)
- S3: $0-1 (free tier: 5GB)
- CloudFront: $0-1 (free tier: 50GB)
- API Gateway: $0-5 (free tier: 1M calls)
- Route 53: $0.50 (hosted zone)
- **Total: ~$1-15/month**

**Production Environment (Monthly):**
- Depends on traffic volume
- Monitor and optimize based on usage

## Security Best Practices

### 1. Access Keys Management

```bash
# Rotate access keys regularly
aws iam create-access-key --user-name quiz-app-developer

# Delete old keys after testing new ones
aws iam delete-access-key \
  --user-name quiz-app-developer \
  --access-key-id AKIAIOSFODNN7EXAMPLE
```

### 2. Enable CloudTrail

```bash
aws cloudtrail create-trail \
  --name quiz-app-audit-trail \
  --s3-bucket-name quiz-app-cloudtrail-logs \
  --include-global-service-events \
  --is-multi-region-trail
```

### 3. Use AWS Config (Optional)

Monitor compliance and configuration changes:
```bash
aws configservice put-configuration-recorder \
  --configuration-recorder name=quiz-app-config-recorder \
  --recording-group allSupported=true,includeGlobalResourceTypes=true
```

## GitHub Actions Setup

### 1. Create GitHub Secrets

In your GitHub repository:
- Settings → Secrets and Variables → Actions
- Add the following secrets:

```
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
```

### 2. OIDC Setup (Alternative to Access Keys)

For enhanced security, use OIDC instead of access keys:

1. **Create IAM OIDC Provider:**
```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

2. **Create IAM Role for GitHub Actions:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT-ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:YOUR-USERNAME/YOUR-REPO:ref:refs/heads/main"
        }
      }
    }
  ]
}
```

## Troubleshooting

### Common Setup Issues

1. **Access Denied Errors:**
   - Check IAM policies
   - Verify user has required permissions
   - Check resource-based policies

2. **Region Issues:**
   - Ensure consistent region usage
   - Some services only available in specific regions

3. **Service Limits:**
   - Request limit increases through AWS Support
   - Monitor service quotas

4. **Billing Issues:**
   - Check billing dashboard regularly
   - Set up cost alerts
   - Review resource usage

### Support Resources

- **AWS Documentation:** https://docs.aws.amazon.com/
- **AWS Support:** Basic (Free), Developer ($29/month), Business ($100/month)
- **AWS Forums:** https://forums.aws.amazon.com/
- **Stack Overflow:** Tag questions with `amazon-web-services`

## Next Steps

After completing AWS setup:

1. Deploy infrastructure using CloudFormation
2. Test deployment pipeline
3. Configure monitoring and alerting
4. Set up backup and disaster recovery
5. Implement security monitoring

See [deployment.md](deployment.md) for detailed deployment instructions.
