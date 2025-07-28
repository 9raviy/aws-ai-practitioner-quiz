# AWS Setup Guide for Bedrock Integration

## 🎯 Current Status: Ready for AWS Configuration

Phase 1.1 is **COMPLETED**! ✅

- ✅ Backend project initialized with TypeScript
- ✅ AWS SDK v3 installed
- ✅ Project structure created
- ✅ TypeScript compilation working

## 🔄 Next Step: Configure AWS Credentials for Bedrock

### Step 1: Install AWS CLI (if not already installed)

**Download and install from**: https://aws.amazon.com/cli/

Verify installation:

```powershell
aws --version
```

### Step 2: Configure AWS Credentials

You need an AWS account with Bedrock access in **us-west-2** region.

```powershell
# Configure AWS credentials
aws configure

# You'll be prompted for:
# AWS Access Key ID: [Your access key]
# AWS Secret Access Key: [Your secret key]
# Default region name: us-west-2
# Default output format: json
```

### Step 3: Verify AWS Configuration

```powershell
# Check configuration
aws configure list

# Test AWS connectivity
aws sts get-caller-identity

# Check if you can access Bedrock in us-west-2
aws bedrock list-foundation-models --region us-west-2
```

### Step 4: Enable Bedrock Model Access

1. **Go to AWS Console** → **Amazon Bedrock** → **us-west-2 region**
2. **Navigate to "Model access"** in the left sidebar
3. **Click "Manage model access"**
4. **Find "Anthropic Claude 3.5 Sonnet"** and **enable access**
5. **Submit request** (usually approved instantly)

### Step 5: Test Bedrock Connection

Once AWS is configured, run our test:

```powershell
# From the backend directory
npm run dev
```

Or test Bedrock directly:

```powershell
node dist/test-bedrock.js
```

## 🔧 Troubleshooting

### Issue: "AWS CLI not found"

- Download and install AWS CLI from: https://aws.amazon.com/cli/
- Restart your terminal after installation

### Issue: "Credentials not configured"

- Run `aws configure` with your AWS access keys
- Ensure your AWS account has Bedrock permissions

### Issue: "Model access denied"

- Go to AWS Console → Bedrock → Model access
- Enable Claude 3.5 Sonnet model access
- Wait for approval (usually instant)

### Issue: "Region not supported"

- Ensure you're using `us-west-2` region
- Claude 3.5 Sonnet is only available in specific regions

## 📋 Pre-requisites Checklist

- [ ] AWS Account with administrator access
- [ ] AWS CLI installed
- [ ] AWS credentials configured for us-west-2
- [ ] Bedrock service enabled in your account
- [ ] Claude 3.5 Sonnet model access granted

## 🚀 What's Next

After AWS setup is complete:

1. **Test Bedrock Connection**: Run `npm run dev` to test Claude integration
2. **Generate Sample Questions**: Verify question generation works
3. **Continue to Phase 1.3**: Quiz question generation logic
4. **Testing Checkpoint 1**: Validate all functionality

---

**Current File**: `AWS_SETUP_GUIDE.md`
**Next Action**: Configure AWS credentials and test Bedrock connection
**Success Indicator**: Successful question generation from Claude 3.5 Sonnet
