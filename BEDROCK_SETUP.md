# AWS Bedrock Setup Guide

## Issue Found

The AI letter generation was failing with the following error:

```
Invocation of model ID anthropic.claude-3-5-sonnet-20241022-v2:0 with on-demand throughput isn't supported. 
Retry your request with the ID or ARN of an inference profile that contains this model.
```

## Root Cause

AWS Bedrock requires using **inference profile IDs** instead of direct model IDs for Claude 3.5 Sonnet v2. This is a recent change by AWS to support cross-region inference and better availability.

## Solution

### 1. Update Your `.env` File

Change the `BEDROCK_MODEL_ID` in your `backend/.env` file from:

```bash
# OLD - Direct model ID (doesn't work)
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0
```

To:

```bash
# NEW - Inference profile ID (works)
BEDROCK_MODEL_ID=us.anthropic.claude-3-5-sonnet-20241022-v2:0
```

The inference profile ID uses the format: `{region}.{model-id}`

### 2. Verify AWS Credentials

Ensure your AWS credentials have Bedrock access. In your `backend/.env`:

```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-actual-access-key-here
AWS_SECRET_ACCESS_KEY=your-actual-secret-key-here
```

Replace `your-aws-access-key` and `your-aws-secret-key` with your actual AWS credentials.

### 3. Enable Bedrock Access

1. **Log in to AWS Console**
2. **Navigate to Bedrock** (search for "Bedrock" in the AWS Console)
3. **Enable Model Access**:
   - Go to "Model access" in the left sidebar
   - Click "Manage model access"
   - Enable "Claude 3.5 Sonnet v2"
   - Click "Save changes"
   - Wait for access to be granted (usually takes a few seconds)

### 4. Verify IAM Permissions

Your IAM user/role needs these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": [
        "arn:aws:bedrock:*::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0",
        "arn:aws:bedrock:*:*:inference-profile/*"
      ]
    }
  ]
}
```

You can attach the AWS managed policy `AmazonBedrockFullAccess` for development, or create a more restricted custom policy for production.

## Testing the Pipeline

We've created a test script to verify your Bedrock setup. Run:

```bash
cd backend
npx ts-node src/tests/bedrock-test.ts
```

This will:
1. ✅ Check AWS credentials are configured
2. ✅ Test Bedrock connection with a simple prompt
3. ✅ Test full letter generation pipeline
4. ✅ Show detailed error messages if something fails

### Expected Output (Success)

```
╔════════════════════════════════════════════╗
║   Steno AI - Bedrock Pipeline Test        ║
╚════════════════════════════════════════════╝

=== Testing Bedrock Connection ===

1. Checking AWS Configuration:
   Region: us-east-1
   Access Key ID: ✓ Set
   Secret Access Key: ✓ Set
   Model ID: us.anthropic.claude-3-5-sonnet-20241022-v2:0

2. Testing Simple Completion:
   Response: "Hello, Steno AI!"
   Duration: 1234ms
   ✓ Bedrock connection successful!

=== Testing Letter Generation Pipeline ===

3. Testing Full Generation Pipeline:
   Input:
   - Case Type: Personal Injury
   - Client: John Doe
   - Defendant: Jane Smith
   - Total Damages: $17,000

   ✓ Letter generated successfully!
   Duration: 3456ms
   Letter length: 1234 characters
   Input tokens: 456
   Output tokens: 789
   Total tokens: 1245
   Model: anthropic.claude-3-5-sonnet-20241022-v2:0

=== Test Summary ===
Connection Test: ✓ PASS
Generation Test: ✓ PASS

✅ All tests passed! Bedrock pipeline is working correctly.
```

## Available Inference Profiles

AWS Bedrock provides several inference profiles for Claude 3.5 Sonnet:

- `us.anthropic.claude-3-5-sonnet-20241022-v2:0` - US cross-region (recommended)
- `eu.anthropic.claude-3-5-sonnet-20241022-v2:0` - EU cross-region
- `anthropic.claude-3-5-sonnet-20241022-v2:0` - Direct model ID (may not work for on-demand)

For development, use the `us.` prefix. For production in Europe, use the `eu.` prefix.

## Troubleshooting

### Error: "Access to AI model denied"

**Cause**: IAM permissions or model access not enabled

**Solution**:
1. Enable model access in Bedrock Console (see step 3 above)
2. Verify IAM permissions (see step 4 above)
3. Wait a few minutes for permissions to propagate

### Error: "Invalid request to AI service"

**Cause**: Using wrong model ID format

**Solution**: Update `BEDROCK_MODEL_ID` to use inference profile format (`us.anthropic.claude-3-5-sonnet-20241022-v2:0`)

### Error: "AI service is currently busy"

**Cause**: Rate limiting or quota exceeded

**Solution**: Wait a moment and retry. For production, consider requesting quota increases in AWS Service Quotas.

### Error: "Missing required fields"

**Cause**: Frontend not sending all required data

**Solution**: Check browser console and ensure all required fields in the generation wizard are filled:
- Case Type
- Incident Date
- Incident Description (at least 10 characters)
- Client Name
- Defendant Name

## Cost Considerations

Claude 3.5 Sonnet v2 pricing (as of Nov 2024):
- **Input**: $3.00 per million tokens
- **Output**: $15.00 per million tokens

A typical demand letter generation uses:
- ~500 input tokens (case details, instructions)
- ~1,000 output tokens (generated letter)
- **Cost per letter**: ~$0.017 (less than 2 cents)

For 1,000 letters per month: ~$17/month in AI costs.

## Next Steps

After updating your `.env` file:

1. **Restart the backend server**:
   ```bash
   cd backend
   pnpm run dev
   ```

2. **Run the test script** (in a new terminal):
   ```bash
   cd backend
   npx ts-node src/tests/bedrock-test.ts
   ```

3. **Try generating a letter** in the UI:
   - Navigate to "Generate Demand Letter"
   - Fill in all required fields
   - Click "Generate"
   - Check the console for detailed logs

## Support

If you continue to have issues:
1. Check the backend logs for detailed error messages
2. Run the test script and share the output
3. Verify your AWS account has Bedrock enabled in your region
4. Consider switching to a different model (e.g., Claude 3 Haiku for lower cost testing)

---

**Updated**: November 11, 2024  
**Model**: Claude 3.5 Sonnet v2  
**Region**: us-east-1

