# SF_DOC_Writer Lambda Function

> AI-powered code documentation generator that adds comprehensive inline comments to source code files.

## Purpose

The SF_DOC_Writer Lambda function is responsible for automatically generating inline documentation for source code files. It retrieves code from S3 storage, analyzes it using AI, and returns the same code enhanced with professional inline comments and documentation.

## Functionality

### Core Features
- **Code Analysis**: Analyzes source code structure and logic flow
- **Inline Documentation**: Adds professional inline comments explaining:
  - Function and method purposes
  - Complex logic decisions
  - Exception handling mechanisms
  - Code block responsibilities
- **Professional Quality**: Generates documentation following senior engineer standards
- **Language Agnostic**: Works with any programming language or file type

### Workflow
1. Receives a `file_id` parameter containing the S3 object key
2. Downloads the file content from the configured S3 bucket
3. Sends the code to Anthropic Claude-3 Haiku model via AWS Bedrock
4. Returns the enhanced code with inline documentation

## API Specification

### Endpoint
```
POST /doc/writer
```

### Request Format
```json
{
  "file_id": "unique-s3-object-key"
}
```

### Response Format
**Success (200)**:
```json
{
  "statusCode": 200,
  "body": "// Enhanced code with inline documentation\nfunction example() {\n  // Detailed explanation of function purpose\n  return result;\n}"
}
```

**Error (404)**:
```json
{
  "statusCode": 404,
  "body": "not found"
}
```

## Requirements

### AWS Services
- **AWS Lambda**: Function runtime environment
- **Amazon S3**: File storage (`simpleflowdata` bucket)
- **AWS Bedrock**: AI model access (Anthropic Claude-3 Haiku)

### IAM Permissions
The Lambda execution role must have the following permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::simpleflowdata/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": "arn:aws:bedrock:eu-west-3::foundation-model/anthropic.claude-3-haiku-20240307-v1:0"
    }
  ]
}
```

### Environment Configuration
- **Region**: `eu-west-3` (Europe - Paris)
- **Model**: `anthropic.claude-3-haiku-20240307-v1:0`
- **S3 Bucket**: `simpleflowdata`

## Installation

### 1. Package Dependencies
```bash
# No additional Python packages required
# Uses built-in boto3 and json libraries
```

### 2. Deploy to AWS Lambda
```bash
# Create deployment package
zip -r sf-doc-writer.zip lambda_function.py

# Deploy using AWS CLI
aws lambda update-function-code \
  --function-name SF_DOC_Writer \
  --zip-file fileb://sf-doc-writer.zip \
  --region eu-west-3
```

### 3. Configure Lambda Settings
- **Runtime**: Python 3.9 or higher
- **Timeout**: 120 seconds (recommended)
- **Memory**: 512 MB (recommended)
- **Environment Variables**: None required (uses hardcoded configuration)

## 📊 Usage Examples

### Input File Content
```python
def calculate_sum(numbers):
    total = 0
    for num in numbers:
        total += num
    return total
```

### Generated Documentation
```python
# Calculates the sum of all numbers in the provided list
# Used for aggregating numerical values in data processing workflows
def calculate_sum(numbers):
    # Initialize accumulator variable to store running total
    total = 0
    
    # Iterate through each number in the input list
    for num in numbers:
        # Add current number to running total
        total += num
    
    # Return the final calculated sum
    return total
```

## 🔍 Monitoring

### CloudWatch Metrics
- **Invocations**: Function call frequency
- **Duration**: Processing time per request
- **Errors**: Failed invocations and error rates
- **Throttles**: Rate limiting occurrences

### Logging
The function logs the following information:
- File content retrieval status
- S3 access attempts
- Bedrock API calls and responses
- Error conditions and exceptions

## 🚨 Error Handling

### Common Issues
1. **S3 Access Errors**: Verify bucket permissions and object existence
2. **Bedrock Model Errors**: Check model availability and quota limits
3. **Timeout Issues**: Increase Lambda timeout for large files
4. **Memory Errors**: Increase Lambda memory allocation

### Troubleshooting
- Check CloudWatch logs for detailed error messages
- Verify IAM permissions for S3 and Bedrock access
- Ensure the S3 object key exists in the `simpleflowdata` bucket
- Validate JSON request format

## 🔐 Security Considerations

- Function uses hardcoded AWS region and model configuration
- S3 bucket access is limited to specific bucket
- No user input validation beyond basic parameter checking
- Consider implementing input sanitization for production use
- Bedrock API calls include request/response logging

## 📝 Development Notes

- The function assumes UTF-8 encoding for all source files
- AI-generated documentation quality depends on code complexity and context
- Processing time varies based on file size and complexity
- Consider implementing caching for frequently processed files