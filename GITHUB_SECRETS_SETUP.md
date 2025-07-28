# 🔐 GitHub Secrets Setup Guide

## Required Secrets for Automated Deployment

To enable automated deployment through GitHub Actions, you need to configure the following secrets in your GitHub repository.

### 🚨 **CRITICAL: Never commit these values to your repository!**

## 1. AWS Credentials

### `AWS_ACCESS_KEY_ID`
Your AWS access key ID for programmatic access.

**How to get it:**
1. Go to AWS IAM Console
2. Create a new user or use existing user
3. Attach policy: `PowerUserAccess` or custom policy with required permissions
4. Generate access keys
5. Copy the Access Key ID

### `AWS_SECRET_ACCESS_KEY`
Your AWS secret access key corresponding to the access key ID above.

**Security Requirements:**
- Must have permissions for:
  - CloudFormation (full access)
  - Lambda (full access)
  - API Gateway (full access)
  - DynamoDB (full access)
  - S3 (full access)
  - IAM (for role creation)
  - Bedrock (for AI model access)

## 2. How to Set Up GitHub Secrets

### Step-by-Step Instructions:

1. **Navigate to Repository Settings**
   ```
   GitHub Repo → Settings → Secrets and variables → Actions
   ```

2. **Add New Repository Secret**
   - Click "New repository secret"
   - Name: `AWS_ACCESS_KEY_ID`
   - Value: Your AWS access key ID
   - Click "Add secret"

3. **Add AWS Secret Access Key**
   - Click "New repository secret"
   - Name: `AWS_SECRET_ACCESS_KEY`
   - Value: Your AWS secret access key
   - Click "Add secret"

## 3. Recommended IAM Policy

Create a custom IAM policy with minimum required permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "cloudformation:*",
                "lambda:*",
                "apigateway:*",
                "dynamodb:*",
                "s3:*",
                "iam:GetRole",
                "iam:CreateRole",
                "iam:DeleteRole",
                "iam:PutRolePolicy",
                "iam:DeleteRolePolicy",
                "iam:AttachRolePolicy",
                "iam:DetachRolePolicy",
                "iam:PassRole",
                "bedrock:*",
                "logs:*"
            ],
            "Resource": "*"
        }
    ]
}
```

## 4. Security Best Practices

### ✅ Do's
- Use dedicated IAM user for GitHub Actions
- Rotate credentials regularly (every 90 days)
- Use minimum required permissions
- Enable CloudTrail for audit logging
- Set up GitHub environment protection rules for production

### ❌ Don'ts
- Never commit AWS credentials to code
- Don't use root AWS account credentials
- Don't share credentials between environments
- Don't store credentials in plain text anywhere

## 5. Environment Protection (Optional but Recommended)

For production deployments, set up environment protection:

1. Go to **Settings** → **Environments**
2. Create environment: `prod`
3. Configure protection rules:
   - Required reviewers
   - Wait timer
   - Deployment branches (only `main`)

## 6. Testing Your Setup

After configuring secrets, test the deployment:

1. Go to **Actions** tab
2. Select **Complete Deployment Pipeline**
3. Click **Run workflow**
4. Choose `dev` environment
5. Monitor the deployment progress

## 7. Troubleshooting

### Common Issues:

**❌ "AWS credentials not found"**
- Check if secrets are named exactly: `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`
- Verify secrets are set at repository level, not environment level

**❌ "Access Denied" errors**
- Check IAM permissions
- Ensure IAM user has required policies attached
- Verify region access (us-east-1)

**❌ "CloudFormation validation failed"**
- Check CloudFormation template syntax
- Verify you have CloudFormation permissions

## 8. Multiple Environments

For different environments (dev/staging/prod), you can:

1. Use same AWS credentials with resource prefixing
2. Or create environment-specific secrets:
   - `DEV_AWS_ACCESS_KEY_ID`
   - `STAGING_AWS_ACCESS_KEY_ID`
   - `PROD_AWS_ACCESS_KEY_ID`

## 9. Local Development

For local development, create `.env` files (which are gitignored):

```bash
# backend/.env
AWS_ACCESS_KEY_ID=your_key_here
AWS_SECRET_ACCESS_KEY=your_secret_here
AWS_REGION=us-east-1
NODE_ENV=development
```

**Remember: Never commit .env files!**

## 10. Verification Checklist

Before first deployment, verify:

- [ ] AWS CLI configured locally and working
- [ ] GitHub secrets configured correctly
- [ ] IAM permissions sufficient
- [ ] CloudFormation template validates
- [ ] No sensitive data in git history
- [ ] .gitignore properly configured

---

🎉 **Once configured, your deployment will be fully automated!**

Push to `main` branch → Automatic deployment to AWS
Manual trigger → Deploy any environment on demand
