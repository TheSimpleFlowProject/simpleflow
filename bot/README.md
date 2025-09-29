# SimpleFlow

## Contributing

If you have suggestions for how SimpleFlow could be improved, or want to report a bug, open an issue! We welcome all contributions.

For more, check out the [Contributing Guide](CONTRIBUTING.md).

# SimpleFlow Bot — bot/index.js

Overview
- bot/index.js is the Probot entry point for the SimpleFlow application.
- It listens to GitHub events (PR opened/closed, comments, installation) and coordinates:
  - uploading files to an S3 bucket,
  - calling Lambda functions exposed via URL (UrlLambdaService),
  - creating/updating issues, branches and pull requests.

Main features
- pull_request.opened
  - Lists changed files.
  - For each text file: downloads the content, uploads it to S3, calls the file analysis lambda (`fileAnalysis`), and posts the results as comments.
  - Aggregates analyses and generates a summary using the `summary` lambda, then updates the PR body with that summary.
- pull_request.closed (when merged)
  - For each changed file: uploads the file to S3, calls the `documentation` lambda to generate a documented version, creates a branch `docs_<file>_<timestamp>`, commits the documented file, and attempts to create a PR.
- discussion_comment.created & issue_comment.created
  - If a comment contains `!sf`, calls the `issueCreation` or `issueUpdate` lambdas to create or update issues accordingly.
- installation.created
  - Example flow: creates a branch, adds a file, and opens a PR for newly installed repositories.

Architecture & dependencies
- AWS S3: initialized via `AWS.S3` (region: eu-west-3). Bucket used: `simpleflowdata`.
- UrlLambdaService: custom service used to invoke Lambdas via URL.
- Config: `config/lambdaConfig` holds Lambda URLs and validation logic.
- Logger: `utils/lambdaErrors` provides `LambdaLogger`.
- Octokit / Probot: used for GitHub integration and API access.

Important environment variables
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
- LAMBDA_LOG_LEVEL (optional)
- Any variables required by `config/lambdaConfig` (Lambda URLs, timeouts, etc.)

How to add or update a Lambda
1. Update `config/lambdaConfig` to include the new Lambda (name, URL, timeout).
2. Add an invoker in the invoker initialization (currently in `index.js` via `UrlLambdaService`).
3. Call the invoker where needed, following the Lambda's input/output contract.
4. Add error handling and user-facing messages (comments) for failures.

How to add a new handler or event
1. Extract the target logic from `index.js` to a new file `handlers/<Name>Handler.js`.
2. Export explicit handler functions (e.g. `handlePullRequestOpened(context, invokers)`).
3. In `index.js`, import the handler and register the Probot event:
   - `app.on('pull_request.opened', ctx => handlers.handlePullRequestOpened(ctx, invokers));`
4. Test the handler locally (see Testing & debugging).

Maintenance and best practices
- Never commit AWS credentials to the repository. Use CI secrets or GitHub environment secrets.
- Validate Lambda responses (JSON schema) before consuming the data.
- For large PRs consider asynchronous processing (job queue) or chunking to avoid timeouts.
- Organize code into `handlers/` and `services/` to ease testing and maintenance.

Testing & local debugging
- Use Probot for local development:
  - `npx probot run ./index.js` (or your project's start command).
  - Provide an installation token and a webhook proxy (e.g., ngrok) if needed.
- Mock `context.octokit` and `UrlLambdaService` for unit tests.
- Inspect logs via `LambdaLogger`, `app.log`, and `context.log`.

Quick checklist for adding a GitHub + Lambda feature
1. Update `config/lambdaConfig`.
2. Add or reuse a Lambda invoker.
3. Implement or update a handler to use the invoker.
4. Add robust error handling and user feedback.
5. Test locally and on a sandbox repository before deploying.

References
- Probot docs: https://probot.github.io/docs/
- AWS SDK for JavaScript: https://docs.aws.amazon.com/sdk-for-javascript/
- Internal files: `services/urlLambdaService.js`, `config/lambdaConfig.js`, `utils/lambdaErrors.js`

## License

[ISC](LICENSE) © 2025 The SimpleFlow Project
