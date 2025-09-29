# SF_ISSUE_ReWriter Lambda Function

> AI-powered GitHub issue updater that refines and enhances existing issues based on developer feedback and comments.

## Purpose

The SF_ISSUE_ReWriter Lambda function intelligently updates existing GitHub issues by incorporating feedback from comments and discussions. It takes the original issue content along with developer feedback and generates an improved version that addresses concerns, clarifications, and additional requirements.

## Functionality

### Core Features
- **Issue Enhancement**: Refines existing GitHub issues based on feedback
- **Context Integration**: Combines original issue content with developer comments
- **Professional Refinement**: Maintains professional, technical tone while incorporating feedback
- **Dual Output**: Generates both updated title and enhanced issue body
- **Feedback Processing**: Intelligently parses and integrates developer suggestions and clarifications

### Workflow
1. Receives original issue content and developer feedback/comment
2. Analyzes the feedback to understand requested changes or clarifications
3. Processes both inputs through Anthropic Claude-3 Haiku model
4. Generates enhanced issue body incorporating the feedback
5. Creates updated title reflecting any scope or focus changes
6. Returns both updated components formatted for GitHub

## API Specification

### Endpoint
```
POST /issue/rewriter
```

### Request Format
```json
{
  "issue_content": "Original issue description with acceptance criteria",
  "issue_comment": "Developer feedback, clarifications, or additional requirements"
}
```

### Response Format
**Success (200)**:
```json
{
  "statusCode": 200,
  "body": {
    "title": "Enhanced user authentication system with OAuth support",
    "body": "## Description\n\nImplement a comprehensive user authentication system with OAuth integration based on team feedback. This enhanced version includes social login options and improved security measures.\n\n## Updated Acceptance Criteria\n\n- [ ] Create login form with email and password fields\n- [ ] Add OAuth integration (Google, GitHub)\n- [ ] Implement secure password validation with complexity requirements\n- [ ] Add session management with configurable duration\n- [ ] Create logout functionality with session cleanup\n- [ ] Add password reset with email verification\n- [ ] Implement proper error handling and user feedback\n- [ ] Ensure WCAG compliance for accessibility"
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

## Requirements

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

## Usage Examples

### Example 1: Adding Security Requirements
**Input:**
```json
{
  "issue_content": "## Description\nAdd user login functionality\n\n## Acceptance Criteria\n- [ ] Create login form\n- [ ] Add password validation",
  "issue_comment": "!sf We also need OAuth integration with Google and GitHub, plus two-factor authentication for enhanced security"
}
```

**Output:**
```json
{
  "title": "Implement secure user authentication with OAuth and 2FA",
  "body": "## Description\nImplement comprehensive user authentication system with OAuth integration and two-factor authentication for enhanced security.\n\n## Acceptance Criteria\n- [ ] Create responsive login form\n- [ ] Add password validation with complexity requirements\n- [ ] Integrate OAuth with Google authentication\n- [ ] Integrate OAuth with GitHub authentication\n- [ ] Implement two-factor authentication (TOTP)\n- [ ] Add backup codes for 2FA recovery\n- [ ] Create secure session management\n- [ ] Add proper error handling and user feedback"
}
```

### Example 2: Clarifying Technical Requirements
**Input:**
```json
{
  "issue_content": "## Description\nOptimize database queries\n\n## Acceptance Criteria\n- [ ] Improve query performance",
  "issue_comment": "!sf Please specify which queries are slow - the user dashboard queries are taking 3+ seconds. We need indexing on user_id and created_at columns."
}
```

**Output:**
```json
{
  "title": "⚡ Optimize user dashboard database queries and add strategic indexing",
  "body": "## Description\nOptimize slow-performing database queries specifically affecting the user dashboard, which currently experiences 3+ second load times.\n\n## Acceptance Criteria\n- [ ] Analyze current user dashboard query performance\n- [ ] Add database index on user_id column\n- [ ] Add database index on created_at column\n- [ ] Optimize dashboard data retrieval queries\n- [ ] Implement query result caching where appropriate\n- [ ] Reduce dashboard load time to under 1 second\n- [ ] Add query performance monitoring\n- [ ] Document indexing strategy for future reference"
}
```

## Error Handling

### Common Issues
1. **Missing Parameters**: Returns 404 when `issue_content` or `issue_comment` fields are missing
2. **Bedrock Model Errors**: Check model availability and quota limits
3. **Token Limit Exceeded**: Very long issues + comments may exceed model limits
4. **JSON Parsing Errors**: Malformed request body

### Troubleshooting
- Check CloudWatch logs for detailed error messages
- Verify IAM permissions for Bedrock access
- Ensure request body contains valid JSON with both required fields
- Monitor combined input length to avoid token limits