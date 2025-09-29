# SF_PR_Summarizer Lambda Function

> AI-powered pull request analyzer that generates comprehensive summaries from individual file changes and analyses.

## Purpose

The SF_PR_Summarizer Lambda function synthesizes individual file analysis results into a coherent, comprehensive pull request summary. It takes multiple file summaries and creates a unified description that explains the overall purpose, implementation details, and context of the changes across the entire pull request.

## Functionality

### Core Features
- **Multi-File Synthesis**: Combines individual file analyses into cohesive PR description
- **Contextual Analysis**: Understands relationships between changes across different files
- **Professional Formatting**: Generates Markdown-formatted summaries ready for GitHub
- **Structured Output**: Provides organized sections including:
  - High-level purpose and goals
  - Detailed implementation breakdown
  - System context and dependencies
  - Impact assessment

## API Specification

### Endpoint
```
POST /pr/summarizer
```

### Request Format
```json
{
  "summaries": "{\"src/auth/login.js\": \"Implements OAuth authentication with Google and GitHub providers\", \"src/components/LoginForm.jsx\": \"Creates responsive login form component with validation\", \"tests/auth.test.js\": \"Adds comprehensive test suite for authentication functionality\"}"
}
```

### Response Format
**Success (200)**:
```json
{
  "statusCode": 200,
  "body": "## High-Level Purpose\n\nThis PR introduces a comprehensive user authentication system with OAuth integration for Google and GitHub providers.\n\n## Implementation Details\n\n- **Authentication Backend** (`src/auth/login.js`): Implements OAuth authentication flows with secure token handling\n- **User Interface** (`src/components/LoginForm.jsx`): Creates responsive login form with real-time validation and error handling\n- **Test Coverage** (`tests/auth.test.js`): Adds comprehensive test suite covering authentication flows and edge cases\n\n## Context & Usage\n\nThese changes establish the foundation for user account management across the application. The OAuth integration provides secure, industry-standard authentication while maintaining user experience through the responsive form component. The comprehensive test coverage ensures reliability and facilitates future maintenance."
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
