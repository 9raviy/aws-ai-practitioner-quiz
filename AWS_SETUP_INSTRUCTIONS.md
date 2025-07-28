# 🚀 Phase 1.2: AWS Bedrock Connection Setup

## Step 1: Install AWS CLI (if not already installed)

### Option A: Download AWS CLI Installer
1. Download AWS CLI v2 for Windows: https://awscli.amazonaws.com/AWSCLIV2.msi
2. Run the installer with default settings
3. Restart your terminal/PowerShell

### Option B: Install via Chocolatey (if you have it)
```powershell
choco install awscli
```

### Option C: Install via pip (if you have Python)
```powershell
pip install awscli
```

## Step 2: Verify AWS CLI Installation
```powershell
aws --version
# Should show something like: aws-cli/2.x.x Python/3.x.x Windows/...
```

## Step 3: Configure AWS Credentials

### 3a: Configure Basic Credentials
```powershell
aws configure
```

You'll be prompted for:
- **AWS Access Key ID**: Your IAM user access key
- **AWS Secret Access Key**: Your IAM user secret key  
- **Default region name**: `us-west-2`
- **Default output format**: `json`

### 3b: Alternative - Set Environment Variables
Create a `.env` file in the backend directory:
```env
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_DEFAULT_REGION=us-west-2
```

## Step 4: Verify AWS Configuration
```powershell
# Test AWS connection
aws sts get-caller-identity

# Check if Bedrock is available in us-west-2
aws bedrock list-foundation-models --region us-west-2
```

## Step 5: Enable Bedrock Model Access

### In AWS Console:
1. Go to AWS Bedrock console in us-west-2 region
2. Navigate to "Model access" in the left sidebar
3. Click "Enable specific models"
4. Find and enable **Anthropic Claude 3.5 Sonnet v2**
5. Submit the request (may take a few minutes to approve)

### Check Model Access via CLI:
```powershell
aws bedrock list-foundation-models --region us-west-2 --query "modelSummaries[?contains(modelId, 'claude-3-5-sonnet')]"
```

## Step 6: Required IAM Permissions

Ensure your IAM user/role has these permissions:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "bedrock:InvokeModel",
                "bedrock:ListFoundationModels",
                "bedrock:GetFoundationModel"
            ],
            "Resource": "*"
        }
    ]
}
```

## Step 7: Test Bedrock Connection

Once AWS CLI is configured, run our test:
```powershell
cd backend
npm run dev
# Or directly:
npx ts-node src/test-bedrock.ts
```

## Troubleshooting

### Common Issues:

**1. "Command not found: aws"**
- AWS CLI not installed or not in PATH
- Restart terminal after installation

**2. "Unable to locate credentials"**
- Run `aws configure` to set up credentials
- Check if `.aws/credentials` file exists in your home directory

**3. "AccessDeniedException"**
- Bedrock model access not enabled in AWS Console
- Insufficient IAM permissions

**4. "Region not supported"**
- Ensure you're using `us-west-2` region
- Bedrock may not be available in all regions

### Next Steps After Setup:
1. ✅ AWS CLI installed and configured
2. ✅ Bedrock model access enabled
3. ✅ Credentials working
4. 🔄 Ready to test Bedrock connection with our TypeScript code

---
**Status**: Phase 1.2 - AWS Configuration
**Next**: Test Bedrock connectivity with Claude 3.5 Sonnet
