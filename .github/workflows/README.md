# GitHub Actions Workflows

## CI/CD Pipeline (Phase 5)

This directory will contain GitHub Actions workflows for automated deployment:

### Workflows to be created:

#### 1. Backend Deployment (`deploy-backend.yml`)

- Triggers on push to main branch (backend changes)
- Builds and packages Lambda function
- Deploys CloudFormation stack
- Runs integration tests

#### 2. Frontend Deployment (`deploy-frontend.yml`)

- Triggers on push to main branch (frontend changes)
- Builds React application
- Deploys to S3 and invalidates CloudFront
- Runs end-to-end tests

#### 3. Infrastructure Deployment (`deploy-infra.yml`)

- Triggers on infrastructure changes
- Validates CloudFormation templates
- Deploys infrastructure stacks
- Updates documentation

#### 4. Pull Request Validation (`pr-validation.yml`)

- Runs on pull requests
- Executes unit tests
- Performs code quality checks
- Validates build process

## Secrets Required

Configure these in GitHub repository settings:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION` (us-west-2)
- `AWS_ACCOUNT_ID`

## Status

⏳ Workflows will be implemented in Phase 5 after all components are working locally.
