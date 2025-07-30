# Troubleshooting Guide

## Common Deployment Issues

### CloudFormation Issues

#### Stack Creation Fails

**Error:** `CREATE_FAILED` status with rollback

**Common Causes:**
1. **Invalid Parameter Values**
   ```bash
   # Check parameter file
   cat cloudformation-params.json
   
   # Validate parameters match template
   aws cloudformation validate-template \
     --template-body file://infrastructure/cloudformation.yaml
   ```

2. **IAM Permissions**
   ```bash
   # Check current user permissions
   aws sts get-caller-identity
   
   # Test CloudFormation permissions
   aws cloudformation describe-stacks
   ```

3. **Resource Name Conflicts**
   - S3 bucket names must be globally unique
   - Check existing resources with same names
   ```bash
   aws s3 ls | grep quiz-app
   aws lambda list-functions | grep QuizApp
   ```

**Solutions:**
```bash
# Delete failed stack and retry
aws cloudformation delete-stack --stack-name quiz-infrastructure-prod
aws cloudformation wait stack-delete-complete --stack-name quiz-infrastructure-prod

# Create with different parameter values
aws cloudformation create-stack \
  --stack-name quiz-infrastructure-prod \
  --template-body file://infrastructure/cloudformation.yaml \
  --parameters file://cloudformation-params.json \
  --capabilities CAPABILITY_IAM
```

#### Stack Update Fails

**Error:** `UPDATE_ROLLBACK_COMPLETE` status

**Common Causes:**
1. **Immutable Resource Changes**
   - Some resources can't be updated (e.g., S3 bucket name)
   - CloudFormation attempts to replace resource

2. **Resource Dependencies**
   - Circular dependencies
   - Resources in use by other services

**Solutions:**
```bash
# Check update failure reason
aws cloudformation describe-stack-events \
  --stack-name quiz-infrastructure-prod \
  --query 'StackEvents[?ResourceStatus==`UPDATE_FAILED`]'

# For complete replacement:
aws cloudformation delete-stack --stack-name quiz-infrastructure-prod
# Wait for deletion, then create new stack
```

### Lambda Deployment Issues

#### Function Code Update Fails

**Error:** `InvalidParameterValueException`

**Common Causes:**
1. **Zip File Too Large**
   ```bash
   # Check zip file size (limit: 50MB)
   ls -lh backend-deployment.zip
   
   # Reduce size by excluding unnecessary files
   cd backend
   zip -r ../backend-deployment.zip . \
     -x "node_modules/.cache/*" \
     -x "*.log" \
     -x "*.test.*" \
     -x "coverage/*"
   ```

2. **Missing Dependencies**
   ```bash
   # Ensure production dependencies are included
   cd backend
   npm ci --production
   
   # Verify critical modules exist
   ls node_modules/serverless-http
   ls node_modules/express
   ```

3. **Incorrect Entry Point**
   ```bash
   # Check Lambda function configuration
   aws lambda get-function-configuration \
     --function-name QuizAppFunction
   
   # Verify index.js exists in zip
   unzip -l backend-deployment.zip | grep index.js
   ```

**Solutions:**
```bash
# Rebuild deployment package
cd backend
rm -rf node_modules dist
npm ci --production
npm run build
cd ..
zip -r backend-deployment.zip backend/ -x "backend/src/*" "backend/*.ts"

# Update function code
aws lambda update-function-code \
  --function-name QuizAppFunction \
  --zip-file fileb://backend-deployment.zip
```

#### Lambda Runtime Errors

**Error:** `Module not found` or `Cannot find module`

**Diagnostic Commands:**
```bash
# Check Lambda logs
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/QuizApp

aws logs filter-log-events \
  --log-group-name /aws/lambda/QuizAppFunction \
  --start-time $(date -d '1 hour ago' +%s)000

# Test function directly
aws lambda invoke \
  --function-name QuizAppFunction \
  --payload '{"httpMethod":"GET","path":"/health"}' \
  response.json
cat response.json
```

**Common Solutions:**
1. **Fix Module Structure**
   ```bash
   # Ensure proper package structure
   cd backend
   mkdir -p lambda_package
   cp -r dist/* lambda_package/
   cp -r node_modules lambda_package/
   cd lambda_package
   zip -r ../../backend-deployment.zip .
   ```

2. **Check Entry Point**
   ```javascript
   // Ensure index.js exports handler
   exports.handler = serverless(app);
   ```

### API Gateway Issues

#### Custom Domain Not Working

**Error:** 403 Forbidden or DNS resolution fails

**Diagnostic Commands:**
```bash
# Check custom domain configuration
aws apigateway get-domain-name --domain-name api.quizaxis.com

# Check Route 53 records
aws route53 list-resource-record-sets \
  --hosted-zone-id YOUR_HOSTED_ZONE_ID

# Test direct API Gateway endpoint
curl https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod/health
```

**Solutions:**
1. **Fix DNS Records**
   ```bash
   # Get API Gateway target domain
   aws apigateway get-domain-name \
     --domain-name api.quizaxis.com \
     --query 'domainNameConfigurations[0].targetDomainName'
   
   # Update Route 53 record to point to correct target
   ```

2. **Certificate Issues**
   ```bash
   # Check certificate status
   aws acm list-certificates --region us-east-1
   
   # Verify certificate validation
   aws acm describe-certificate \
     --certificate-arn YOUR_CERT_ARN \
     --region us-east-1
   ```

#### CORS Issues

**Error:** Browser blocks requests due to CORS policy

**Symptoms:**
- API works with curl/Postman
- Fails in browser with CORS error
- OPTIONS requests fail

**Solutions:**
1. **Check API Gateway CORS Configuration**
   ```bash
   # Test OPTIONS request
   curl -X OPTIONS https://api.quizaxis.com/questions \
     -H "Origin: https://quizaxis.com" \
     -H "Access-Control-Request-Method: GET" \
     -v
   ```

2. **Update Lambda CORS Headers**
   ```typescript
   // In Lambda response
   return {
     statusCode: 200,
     headers: {
       'Access-Control-Allow-Origin': 'https://quizaxis.com',
       'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
       'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
     },
     body: JSON.stringify(data)
   };
   ```

### Frontend Deployment Issues

#### Build Failures

**Error:** Build process fails during deployment

**Common Causes:**
1. **TypeScript Errors**
   ```bash
   cd frontend
   npm run type-check
   ```

2. **Environment Variable Issues**
   ```bash
   # Check environment variables
   cat frontend/.env
   cat frontend/.env.local
   
   # Verify VITE_ prefix for environment variables
   grep VITE_ frontend/.env*
   ```

3. **Dependency Issues**
   ```bash
   # Clear cache and reinstall
   cd frontend
   rm -rf node_modules package-lock.json
   npm install
   ```

**Solutions:**
```bash
# Local build test
cd frontend
npm run build

# Check build output
ls -la dist/

# Manual deployment
aws s3 sync dist/ s3://quiz-app-frontend-bucket --delete
```

#### CloudFront Issues

**Error:** Old content cached, updates not visible

**Solutions:**
```bash
# Create invalidation
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"

# Check invalidation status
aws cloudfront list-invalidations \
  --distribution-id YOUR_DISTRIBUTION_ID

# Force browser cache refresh (Ctrl+F5)
```

### DynamoDB Issues

#### Table Access Errors

**Error:** `AccessDeniedException`

**Diagnostic Commands:**
```bash
# Check table exists
aws dynamodb list-tables

# Test table access
aws dynamodb scan \
  --table-name quiz-questions-prod \
  --limit 1

# Check IAM permissions
aws iam get-user-policy \
  --user-name quiz-app-developer \
  --policy-name DynamoDBAccess
```

**Solutions:**
1. **Update IAM Permissions**
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
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
       }
     ]
   }
   ```

### AWS Bedrock Issues

#### Model Access Denied

**Error:** `AccessDeniedException` when calling Bedrock

**Solutions:**
```bash
# Check available models
aws bedrock list-foundation-models --region us-east-1

# Request model access (if needed)
# Go to AWS Console → Bedrock → Model Access
# Request access to required models

# Test model access
aws bedrock invoke-model \
  --model-id anthropic.claude-v2 \
  --body '{"prompt":"Hello","max_tokens_to_sample":100}' \
  --cli-binary-format raw-in-base64-out \
  output.json
```

## Environment-Specific Issues

### Development Environment

#### Local Development Server Issues

**Port Already in Use:**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /F /PID <process_id>

# macOS/Linux
lsof -ti:3000 | xargs kill -9
```

**Environment Variable Issues:**
```bash
# Check environment variables are loaded
cd backend
node -e "console.log(process.env.AWS_REGION)"

cd frontend  
npm run dev -- --debug
```

### Production Environment

#### Performance Issues

**High Lambda Cold Start Times:**
```bash
# Check function configuration
aws lambda get-function-configuration \
  --function-name QuizAppFunction

# Consider increasing memory allocation
aws lambda update-function-configuration \
  --function-name QuizAppFunction \
  --memory-size 512
```

**DynamoDB Throttling:**
```bash
# Check table metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ConsumedReadCapacityUnits \
  --dimensions Name=TableName,Value=quiz-questions-prod \
  --start-time $(date -d '1 hour ago' --iso-8601) \
  --end-time $(date --iso-8601) \
  --period 300 \
  --statistics Sum
```

## GitHub Actions Issues

### Workflow Failures

#### AWS Credentials Issues

**Error:** `Unable to locate credentials`

**Solutions:**
1. **Check GitHub Secrets**
   - Repository → Settings → Secrets and Variables → Actions
   - Verify `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`

2. **Test Credentials**
   ```yaml
   - name: Test AWS Credentials
     run: aws sts get-caller-identity
   ```

#### Deployment Timeout Issues

**Error:** Workflow times out during deployment

**Solutions:**
```yaml
# Increase timeout
jobs:
  deploy:
    timeout-minutes: 30  # Default is 6 hours, but can be reduced
    
    steps:
    - name: Deploy CloudFormation
      timeout-minutes: 20  # Step-level timeout
```

### Concurrent Deployment Issues

**Error:** Multiple workflows running simultaneously

**Solutions:**
```yaml
# Add concurrency control
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

## Monitoring and Debugging

### CloudWatch Logs

```bash
# Stream logs in real-time
aws logs tail /aws/lambda/QuizAppFunction --follow

# Search logs for errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/QuizAppFunction \
  --filter-pattern "ERROR"

# Export logs for analysis
aws logs export-task \
  --log-group-name /aws/lambda/QuizAppFunction \
  --from $(date -d '1 day ago' +%s)000 \
  --to $(date +%s)000 \
  --destination quiz-app-logs-bucket
```

### API Testing

```bash
# Test health endpoint
curl -v https://api.quizaxis.com/health

# Test with API key
curl -H "x-api-key: YOUR_API_KEY" https://api.quizaxis.com/questions

# Test from different locations
curl -H "CF-IPCountry: US" https://api.quizaxis.com/health
```

### Performance Testing

```bash
# Simple load test
for i in {1..10}; do
  curl -w "@curl-format.txt" -s -o /dev/null https://quizaxis.com
done

# Using Apache Bench
ab -n 100 -c 10 https://api.quizaxis.com/health
```

## Getting Help

### AWS Support

1. **Basic Support (Free):**
   - AWS Forums
   - Documentation
   - Service Health Dashboard

2. **Developer Support ($29/month):**
   - Technical support during business hours
   - General guidance

3. **Business Support ($100/month):**
   - 24/7 technical support
   - Architectural guidance

### Community Resources

- **Stack Overflow:** Tag questions with `amazon-web-services`
- **AWS Forums:** https://forums.aws.amazon.com/
- **AWS Discord:** https://discord.gg/aws
- **GitHub Issues:** For code-specific problems

### Escalation Process

1. **Check this troubleshooting guide**
2. **Search AWS documentation**
3. **Check CloudWatch logs**
4. **Test with minimal reproduction case**
5. **Create support ticket with details:**
   - Error messages
   - Steps to reproduce
   - CloudFormation template
   - Log excerpts
   - Timeline of issue
