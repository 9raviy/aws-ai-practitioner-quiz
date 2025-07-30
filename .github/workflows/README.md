# GitHub Actions Workflows

## Overview

This project uses GitHub Actions for automated CI/CD with a simple two-environment strategy:

- **Development** (`dev` branch) → Development environment
- **Production** (`main` branch) → Production at quizaxis.com

## Active Workflows

### 1. Development Deployment (`deploy-complete.yml`)

**Purpose:** Deploy to development environment for testing and validation

**Triggers:**
- ✅ Push to `dev` branch (automatic)
- ✅ Pull requests to `main` branch (validation)
- ✅ Manual dispatch (workflow_dispatch)

**Environment:** Development
**Stack Name:** `quiz-infrastructure-dev`
**Domain:** API Gateway endpoint (no custom domain)

### 2. Production Deployment (`deploy-production.yml`)

**Purpose:** Deploy to production environment at quizaxis.com

**Triggers:**
- ✅ Push to `main` branch (automatic)
- ✅ Manual dispatch with deployment options

**Environment:** Production  
**Stack Name:** `quiz-infrastructure-prod`
**Domain:** quizaxis.com (custom domain with SSL)

**Features:**
- WAF protection
- Custom domain with SSL certificate
- CloudFront CDN
- Rate limiting

### 3. Infrastructure Only (`deploy-infrastructure.yml`)

**Purpose:** Deploy infrastructure changes without code updates

**Triggers:**
- ✅ Manual dispatch only

### 4. Development Workflow (`deploy-dev.yml`)

**Status:** Disabled (manual triggers only)

## Branch Strategy

### `main` Branch (Production)
- Protected branch with required reviews
- Automatic deployment to quizaxis.com
- Requires all checks to pass

### `dev` Branch (Development)  
- Active development branch
- Automatic deployment to development environment
- More flexible for testing

## Development Process

1. **Create Feature Branch**
   ```bash
   git checkout dev
   git checkout -b feature/new-feature
   ```

2. **Deploy to Development**
   ```bash
   # Create PR to dev branch
   # Merge triggers deploy-complete.yml
   ```

3. **Deploy to Production**
   ```bash
   # Create PR from dev to main
   # Merge triggers deploy-production.yml
   ```

## Required Secrets

Configure in GitHub repository settings:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION` (us-east-1)

## Status

✅ **Active** - Workflows are deployed and operational

See [deployment guide](../docs/deployment.md) for detailed workflow documentation.
