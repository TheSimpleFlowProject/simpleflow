# SF_ISSUE_Writer Lambda Function

> AI-powered GitHub issue generator that creates structured, professional issues from natural language input.

## 🎯 Purpose

The SF_ISSUE_Writer Lambda function transforms natural language descriptions into well-structured GitHub issues. It generates professional issue titles with emojis and comprehensive issue bodies with acceptance criteria, making issue creation more efficient and standardized across projects.

## 🔧 Functionality

### Core Features
- **Issue Generation**: Creates structured GitHub issues from free-form text input
- **Title Generation**: Generates clear, concise titles with appropriate emojis
- **Professional Formatting**: Produces Markdown-formatted issue content including:
  - Clear problem/feature descriptions
  - Structured acceptance criteria in checklist format
  - Professional, action-oriented tone
- **Dual Output**: Returns both title and body content for complete issue creation

### Workflow
1. Receives natural language content describing a feature, bug, or task
2. Processes the input through Anthropic Claude-3 Haiku model
3. Generates structured issue body with acceptance criteria
4. Creates a concise, professional title
5. Returns both components formatted for GitHub

## 📋 API Specification

### Endpoint
```
POST /issue/writer
```

### Request Format
```json
{
  "content": "Add user authentication to the dashboard. Users should be able to login with email and password, and stay logged in for 7 days."
}
```

### Response Format
**Success (200)**:
```json
{
  "statusCode": 200,
  "body": {
    "title": "🔐 Implement user authentication system for dashboard",
    "body": "## Description\n\nImplement a comprehensive user authentication system for the dashboard application. This feature will allow users to securely access their accounts using email and password credentials, with persistent login sessions.\n\n## Acceptance Criteria\n\n- [ ] Create login form with email and password fields\n- [ ] Implement secure password validation\n- [ ] Add session management with 7-day persistence\n- [ ] Create logout functionality\n- [ ] Add password reset capability\n- [ ] Implement proper error handling for invalid credentials\n- [ ] Ensure responsive design for mobile devices"
  }
}
```

**Error (404)**:
```json
{
  "statusCode": 404,
  "body": "not found"
}
```

## 🚀 Requirements

### AWS Services
- **AWS Lambda**: Function runtime environment
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
- **Max Tokens**: 4096 per request

## 🛠️ Installation

### 1. Package Dependencies
```bash
# No additional Python packages required
# Uses built-in boto3 and json libraries
```

### 2. Deploy to AWS Lambda
```bash
# Create deployment package
zip -r sf-issue-writer.zip lambda_function.py

# Deploy using AWS CLI
aws lambda update-function-code \
  --function-name SF_ISSUE_Writer \
  --zip-file fileb://sf-issue-writer.zip \
  --region eu-west-3
```

### 3. Configure Lambda Settings
- **Runtime**: Python 3.9 or higher
- **Timeout**: 30 seconds (recommended)
- **Memory**: 256 MB (recommended)
- **Environment Variables**: None required

## 📊 Usage Examples

### Example 1: Feature Request
**Input:**
```json
{
  "content": "Need a dark mode toggle for better user experience during night time usage"
}
```

**Output:**
```json
{
  "title": "🌙 Add dark mode toggle for improved night-time user experience",
  "body": "## Description\n\nImplement a dark mode feature to enhance user experience during night-time usage...\n\n## Acceptance Criteria\n\n- [ ] Add dark mode toggle button to UI\n- [ ] Implement dark theme color scheme\n- [ ] Save user preference in local storage\n- [ ] Apply theme across all components"
}
```

### Example 2: Bug Report
**Input:**
```json
{
  "content": "Users report that the search function is not working properly on mobile devices"
}
```

**Output:**
```json
{
  "title": "🐛 Fix search function issues on mobile devices",
  "body": "## Description\n\nInvestigate and resolve reported issues with search functionality on mobile devices...\n\n## Acceptance Criteria\n\n- [ ] Identify root cause of mobile search issues\n- [ ] Fix search input responsiveness\n- [ ] Test search functionality across different mobile devices\n- [ ] Verify search results display correctly on mobile"
}
```

## 🔍 Monitoring

### CloudWatch Metrics
- **Invocations**: Function call frequency
- **Duration**: Processing time per request
- **Errors**: Failed invocations and error rates
- **Throttles**: Rate limiting occurrences

### Logging
The function logs the following information:
- Input content processing status
- Bedrock API calls and responses
- Generated issue titles and bodies
- Error conditions and exceptions

## 🚨 Error Handling

### Common Issues
1. **Missing Content Parameter**: Returns 404 when `content` field is not provided
2. **Bedrock Model Errors**: Check model availability and quota limits
3. **Token Limit Exceeded**: Large inputs may exceed model token limits
4. **JSON Parsing Errors**: Malformed request body

### Troubleshooting
- Check CloudWatch logs for detailed error messages
- Verify IAM permissions for Bedrock access
- Ensure request body contains valid JSON with `content` field
- Monitor token usage for large inputs

## 🔐 Security Considerations

- Function processes user-provided text input
- No input validation beyond parameter existence checking
- Consider implementing content filtering for production use
- Bedrock API calls are logged (may contain sensitive information)
- Rate limiting should be implemented at the API Gateway level

## 📈 Performance Optimization

### Best Practices
- Keep input content concise for faster processing
- Implement caching for common issue templates
- Use appropriate Lambda memory allocation based on usage patterns
- Monitor and adjust timeout settings based on response times

### Scaling Considerations
- Function is stateless and can handle concurrent requests
- Bedrock model has rate limits that may affect high-volume usage
- Consider implementing request queuing for high-traffic scenarios

## 🧪 Testing

### Unit Testing
```python
import json
from lambda_function import lambda_handler

# Test valid input
event = {
    'body': json.dumps({
        'content': 'Add user registration feature'
    })
}
context = {}
response = lambda_handler(event, context)
assert response['statusCode'] == 200
```

### Integration Testing
- Test with various input formats and lengths
- Verify output format compliance with GitHub issue standards
- Test error handling for edge cases
- Validate AI model response consistency

## 📝 Development Notes

- The function generates both issue title and body in a single API call
- AI-generated content quality depends on input clarity and detail
- Consider implementing prompt engineering improvements for better results
- Function assumes input is in English (may work with other languages)
- Generated acceptance criteria follow GitHub checkbox format (`- [ ]`)