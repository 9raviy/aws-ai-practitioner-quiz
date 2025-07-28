# Infrastructure as Code

## AWS Infrastructure Setup

### Phase 3: CloudFormation Templates

This directory contains all AWS infrastructure definitions:

## Components
- **Lambda Functions**: Quiz API handlers
- **API Gateway**: RESTful API endpoints
- **DynamoDB**: Session and progress storage
- **IAM Roles**: Security and permissions
- **S3 Bucket**: Frontend hosting (Phase 5)
- **CloudFront**: CDN distribution (Phase 5)

## Directory Structure (To be created)
```
infrastructure/
├── cloudformation/
│   ├── backend.yml        # Backend infrastructure
│   ├── frontend.yml       # Frontend hosting
│   ├── database.yml       # DynamoDB tables
│   └── iam.yml           # IAM roles and policies
├── scripts/
│   ├── deploy.sh         # Deployment scripts
│   └── cleanup.sh        # Resource cleanup
└── parameters/
    ├── dev.json          # Development parameters
    └── prod.json         # Production parameters
```

## Resources Created

### Backend Stack (backend.yml)
- AWS::Lambda::Function (Quiz API)
- AWS::ApiGateway::RestApi
- AWS::ApiGateway::Deployment
- AWS::Lambda::Permission
- AWS::IAM::Role (Lambda execution role)

### Database Stack (database.yml)
- AWS::DynamoDB::Table (Quiz sessions)
- AWS::DynamoDB::Table (User progress)

### Frontend Stack (frontend.yml)
- AWS::S3::Bucket (Static website hosting)
- AWS::CloudFront::Distribution
- AWS::S3::BucketPolicy

## Deployment Commands (Phase 3)
```bash
# Deploy backend infrastructure
aws cloudformation deploy \
  --template-file cloudformation/backend.yml \
  --stack-name ai-quiz-backend \
  --capabilities CAPABILITY_IAM \
  --region us-west-2

# Deploy database
aws cloudformation deploy \
  --template-file cloudformation/database.yml \
  --stack-name ai-quiz-database \
  --region us-west-2
```
