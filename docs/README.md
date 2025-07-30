# Documentation

## Project Documentation

This directory contains comprehensive documentation for the AWS AI Practitioner Quiz application.

## Quick Start

1. **[AWS Setup Guide](aws-setup.md)** - Set up your AWS account and permissions
2. **[Development Guide](development-guide.md)** - Local development environment setup
3. **[Deployment Guide](deployment.md)** - Deploy to development and production
4. **[Troubleshooting](troubleshooting.md)** - Common issues and solutions

## Essential Documentation

### Getting Started
- **[AWS Setup Guide](aws-setup.md)** - AWS account configuration and IAM setup
- **[Development Guide](development-guide.md)** - Local development environment setup

### Deployment
- **[Deployment Guide](deployment.md)** - Complete deployment workflow and CI/CD
- **[Troubleshooting](troubleshooting.md)** - Common deployment issues and solutions

### Development Resources
- [API Documentation](api.md) - API endpoint documentation *(Coming Soon)*
- [Architecture Overview](architecture.md) - System architecture details *(Coming Soon)*
- [Testing Guide](testing-guide.md) - Testing strategies *(Coming Soon)*

## Documentation Status

### ✅ Complete
- AWS Setup Guide - Complete AWS account and service configuration
- Development Guide - Local development environment and workflow
- Deployment Guide - Branch-based CI/CD with dev/production environments
- Troubleshooting Guide - Common issues and solutions

### 📝 Coming Soon
- API Documentation - Detailed endpoint documentation
- Architecture Documentation - System design and component overview
- Testing Guide - Unit, integration, and E2E testing strategies
- Security Guide - Security best practices and considerations
- Database Schema - DynamoDB table structures and relationships

## Workflow Overview

### Branch Strategy
- **`dev` branch** → Development environment (automatic deployment)
- **`main` branch** → Production environment at quizaxis.com (automatic deployment)

### Development Process
1. Create feature branch from `dev`
2. Develop and test locally
3. Create PR to `dev` → triggers development deployment
4. Test in development environment
5. Create PR from `dev` to `main` → triggers production deployment

## Quick Links

### Project Documentation
- [Main README](../README.md) - Project overview and setup
- [Progress Tracker](../PROGRESS.md) - Development status and milestones
- [GitHub Setup](../GITHUB_SETUP.md) - Repository configuration

### External Resources
- [AWS Documentation](https://docs.aws.amazon.com/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [React Documentation](https://react.dev/)
- [Express.js Documentation](https://expressjs.com/)

## Contributing

When contributing to this documentation:
1. Keep language clear and concise
2. Include code examples where helpful
3. Update this README when adding new documentation
4. Test all commands and procedures before documenting
5. Cross-reference related documentation
