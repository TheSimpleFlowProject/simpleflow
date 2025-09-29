# SimpleFlow

> An intelligent GitHub bot that automates code documentation, pull request analysis, and issue management using AI-powered workflows.

## 🚀 Overview

SimpleFlow is a comprehensive GitHub App built with [Probot](https://github.com/probot/probot) that leverages artificial intelligence to streamline development workflows. It automatically analyzes code changes, generates documentation, creates summaries for pull requests, and assists with issue management.

### Key Features

- **🔍 Automated PR Analysis**: Analyzes changed files in pull requests and provides intelligent summaries
- **📚 AI-Generated Documentation**: Creates comprehensive documentation for code files using AI
- **📝 Issue Management**: Transforms comments into structured GitHub issues with proper formatting
- **🏷️ PR Labeling**: Automatically categorizes pull requests based on content analysis
- **☁️ AWS Integration**: Leverages AWS Lambda, S3, and Bedrock for scalable AI processing
- **🤖 Multi-Model Support**: Supports various AI models including Anthropic Claude and local LLaMA models

## 🏗️ Architecture

SimpleFlow consists of two main components:

### 1. **Bot Layer** (`/bot/`)
- **Framework**: Node.js with Probot
- **Services**: API Gateway integration, Lambda service management
- **Responsibilities**: GitHub event handling, webhook processing, workflow orchestration

### 2. **Lambda Functions** (`/lambdas/`)
- **SF_PR_Summarizer**: Generates concise PR summaries
- **SF_ISSUE_Writer**: Creates structured GitHub issues
- **SF_ISSUE_ReWriter**: Updates existing issues based on comments
- **SF_PR_Labeler**: Automatically labels PRs
- **SF_DOC_Writer**: Generates comprehensive code documentation

## 🛠️ Setup

### Prerequisites

- Node.js >= 18
- AWS Account with configured credentials
- GitHub App registration (Github Developer Program)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/TheSimpleFlowProject/simpleflow.git
cd simpleflow
```

2. **Install Bot dependencies**
```bash
cd bot
npm install
```

3. **Configure environment variables**

Create a `.env` file in the `/bot` directory based on `.env.example`:
```bash
WEBHOOK_PROXY_URL=""
APP_ID=00000000
WEBHOOK_SECRET=development
LOG_LEVEL=debug

AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
-----END RSA PRIVATE KEY-----"

BEDROCK_KEY=""

LAMBDA_DEFAULT_TIMEOUT=30000
LAMBDA_LOG_LEVEL=info

AWS_REGION=eu-west-3

# === API GATEWAY CONFIGURATION (REQUIRED) ===
# API Gateway provides a unified interface with authentication via x-api-key header
# All endpoints below are required for the bot to function properly

# API Gateway root URL (e.g., https://your-api-id.execute-api.region.amazonaws.com/stage)
SF_API_GTW_ROOT="https://exemple.execute-api.eu-west-3.amazonaws.com/prod"

# API Gateway authentication token (passed as x-api-key header)
SF_API_GTW_API_TOKEN=""

# === API GATEWAY ENDPOINTS ===
# Endpoint paths that will be appended to SF_API_GTW_ROOT
# All endpoints below are REQUIRED for proper functionality

# PR Analysis - corresponds to lambdas/SF_PR_Summarizer
SF_API_FILE_ANALYSIS="pr/summarizer"

# PR Labeling - corresponds to lambdas/SF_PR_Labeler  
SF_API_SUMMARY="pr/labeler"

# Documentation Generation - corresponds to lambdas/SF_DOC_Writer
SF_API_DOCUMENTATION="doc/writer"

# Issue Creation - corresponds to lambdas/SF_ISSUE_Writer
SF_API_ISSUE_CREATION="issue/writer"

# Issue Updates - corresponds to lambdas/SF_ISSUE_Rewriter
SF_API_ISSUE_UPDATE="issue/rewriter"

```

### Running Locally

**Start the bot:**
```bash
cd bot
npm start
```

**Run with Docker:**
```bash
cd bot

# Build container
docker build -t simpleflow .

# Run container
docker run --env-file .env simpleflow
```

## 📖 Usage

### Pull Request Analysis
When a PR is opened, SimpleFlow automatically:
1. Analyzes all changed files
2. Uploads content to S3 for processing
3. Generates AI-powered file summaries
4. Updates the PR description with comprehensive analysis
5. Adds comments with detailed breakdowns

### Documentation Generation
When a PR is merged, SimpleFlow:
1. Processes each changed file through AI documentation engine
2. Creates a new branch with documented versions
3. Opens a documentation PR with enhanced comments and explanations

### Issue Management
Use the `!sf` command in comments to:
- **Create Issues**: Comment `!sf [description]` to generate structured issues
- **Update Issues**: Use `!sf` in issue comments to refine and update issue content

## 🔧 Configuration

### Lambda Configuration
Configure API Gateway endpoints in `/bot/config/lambdaConfig.js`:

```javascript
module.exports = {
  getApiGatewayConfig: () => ({
    baseUrl: process.env.API_GATEWAY_BASE_URL,
    endpoints: {
      fileAnalysis: '/dev/sf-pr-summarizer',
      summary: '/dev/sf-summary-generator',
      documentation: '/dev/sf-doc-writer',
      issueCreation: '/dev/sf-issue-writer',
      issueUpdate: '/dev/sf-issue-rewriter'
    }
  })
};
```

### AI Model
SimpleFlow is based on AWS Bedrock, with a pre-selected model. 
- **AWS Bedrock**: Anthropic Claude models

## 🚀 Deployment

### AWS Lambda Deployment
Each function in `/lambdas/` can be deployed independently:

### GitHub App Installation
1. Create a new GitHub App in your organization settings
2. Configure webhooks to point to your deployed bot
3. Install the app on repositories where you want SimpleFlow active

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](bot/CONTRIBUTING.md) for details on:
- Code style and standards
- Development workflow
- Testing requirements
- Pull request process

### Development Guidelines
- Follow the established architecture patterns
- Add tests for new features
- Update documentation for API changes
- Ensure AWS resources are properly configured

## 📄 License

[ISC](bot/LICENSE) © 2025 The SimpleFlow Project

## 🙋‍♂️ Support

- **Issues**: [GitHub Issues](https://github.com/thesimpleflowproject/simpleflow/issues)
- **Discussions**: [GitHub Discussions](https://github.com/thesimpleflowproject/simpleflow/discussions)
- **Documentation**: [Wiki](https://github.com/thesimpleflowproject/simpleflow/wiki)
