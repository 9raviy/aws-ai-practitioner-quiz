# Development Environment Configuration

This directory contains environment-specific configuration files for GitHub Actions.

## Required GitHub Secrets

For the automated deployment to work, you need to set up the following secrets in your GitHub repository:

### AWS Credentials
- `AWS_ACCESS_KEY_ID` - Your AWS access key ID
- `AWS_SECRET_ACCESS_KEY` - Your AWS secret access key

### Optional Environment-Specific Secrets
- `DYNAMODB_TABLE_NAME` - Will be automatically set from CloudFormation outputs

## Setting up GitHub Secrets

1. Go to your GitHub repository
2. Click on **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret with its corresponding value

## Environments

The workflows support three environments:
- **dev** - Development environment
- **staging** - Staging environment  
- **prod** - Production environment

Each environment will create separate AWS resources with prefixed names.

## Security Notes

- Never commit AWS credentials to the repository
- Use GitHub environment protection rules for production deployments
- Rotate AWS credentials regularly
- Use least-privilege IAM policies

## Deployment Process

The automated deployment follows this order:
1. **Infrastructure** - Deploy CloudFormation stack
2. **Backend** - Deploy Lambda function code
3. **Frontend** - Deploy React app to S3
4. **Testing** - Run end-to-end tests

## Manual Deployment

You can trigger deployments manually through GitHub Actions:
1. Go to **Actions** tab in your repository
2. Select **Complete Deployment Pipeline**
3. Click **Run workflow**
4. Choose environment and components to deploy
