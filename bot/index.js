const AWS = require('aws-sdk');
const axios = require('axios');

// Import services and utilities
const ApiGatewayService = require('./services/apiGatewayService');
const lambdaConfig = require('./config/lambdaConfig');
const { LambdaLogger, ErrorHandler } = require('./utils/lambdaErrors');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: 'eu-west-3'
});

// Initialize service layer
const logger = new LambdaLogger({
  logLevel: process.env.LAMBDA_LOG_LEVEL || 'info',
  prefix: '[SimpleFlow]'
});

// Initialize API Gateway service
logger.info('Using API Gateway service');

const apiGatewayConfig = lambdaConfig.getApiGatewayConfig();
const serviceInstance = new ApiGatewayService(apiGatewayConfig, logger);

// Create API Gateway-based function invokers
const fileAnalysisInvoker = serviceInstance.createEndpointInvoker(
  apiGatewayConfig.endpoints.fileAnalysis,
  { timeout: 60000 }
);

const summaryInvoker = serviceInstance.createEndpointInvoker(
  apiGatewayConfig.endpoints.summary,
  { timeout: 90000 }
);

const documentationInvoker = serviceInstance.createEndpointInvoker(
  apiGatewayConfig.endpoints.documentation,
  { timeout: 120000 }
);

const issueCreationInvoker = serviceInstance.createEndpointInvoker(
  apiGatewayConfig.endpoints.issueCreation,
  { timeout: 30000 }
);

const issueUpdateInvoker = serviceInstance.createEndpointInvoker(
  apiGatewayConfig.endpoints.issueUpdate,
  { timeout: 30000 }
);

// Utility function to generate unique file names
function generateUniqueFileName(originalPath, prNumber, repoName) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const randomId = Math.random().toString(36).substring(2, 8);
  const sanitizedPath = originalPath.replace(/[/\\]/g, '_');
  const sanitizedRepo = repoName.replace(/[^a-zA-Z0-9-]/g, '_');
  
  return `${sanitizedRepo}/PR-${prNumber}/${timestamp}_${randomId}_${sanitizedPath}`;
}

async function uploadToS3({ fileName, fileContent, contentType = 'text/plain' }) {
  const params = {
    Bucket: 'simpleflowdata',
    Key: fileName,
    Body: fileContent,
    ContentType: contentType,
    ACL: 'private',
  };

  return s3.upload(params).promise();
}

/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Probot} app
 */
module.exports = (app) => {
  // Validate API Gateway configuration on startup
  const validation = lambdaConfig.validateConfig();
  if (!validation.isValid) {
    app.log.error('API Gateway configuration is invalid:', validation.errors);
    throw new Error('Invalid API Gateway configuration. Please check your environment variables.');
  }
  
  if (validation.hasWarnings) {
    app.log.warn('API Gateway configuration warnings:', validation.warnings);
  }

  // Additional validation for API Gateway service
  const apiValidation = serviceInstance.validateConfig();
  if (!apiValidation.isValid) {
    app.log.error('API Gateway service validation failed:', apiValidation.errors);
    throw new Error('Invalid API Gateway service configuration. Please check your environment variables.');
  }
  
  if (apiValidation.hasWarnings) {
    app.log.warn('API Gateway service warnings:', apiValidation.warnings);
  }

  app.log.info('API Gateway service initialized successfully');
  app.log.info('API Gateway service configuration:', serviceInstance.getStatus());
  app.on('pull_request.opened', async (context) => {
    const prNum = context.payload.pull_request.number;
    const fullName = context.payload.repository.full_name;
    const headRef = context.payload.pull_request.head.ref;
    if (headRef.endsWith('_documented') || headRef.startsWith('docs_')) return;
    app.log.info(`Detected new PR #${prNum} in ${fullName}`);

    app.log.info(context.payload.pull_request)

    await context.octokit.issues.createComment(
      context.issue({
        body: "Accessing feeds...",
      })
    );

    try {
      // Fetch list of changed files
      const { data: files } = await context.octokit.rest.pulls.listFiles({
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name,
        pull_number: prNum,
      });

      await context.octokit.issues.createComment(
        context.issue({
          body: `Analysing ${files.length} file(s)...
          \nPlease wait, it won't take so much time to process.\n
          `,
        })
      );
      
      history = {}

      for (const file of files) {
        const filePath = file.filename;
        app.log.info(`Changed file: ${filePath}`);
        try {
          const { data } = await context.octokit.rest.repos.getContent({
            owner: context.payload.repository.owner.login,
            repo: context.payload.repository.name,
            path: filePath,
            ref: headRef,
          });
          if (!Array.isArray(data)) {
            const content = Buffer.from(data.content, 'base64').toString('utf8');
            app.log.info(`--- Content of ${filePath} ---\n${content}`);
            
            // Generate unique file name for S3 storage
            const uniqueFileName = generateUniqueFileName(filePath, prNum, context.payload.repository.name);
            await uploadToS3({ fileName: uniqueFileName, fileContent: content });
            app.log.info(`Uploaded to S3 with unique name: ${uniqueFileName}`);
            
            // Use API Gateway service for file analysis
            logger.info(`Analyzing file: ${filePath}`);
            const result = await fileAnalysisInvoker({
              file_id: uniqueFileName  // Use unique name for analysis
            });
            history[filePath] = result;
            logger.info(`File analysis completed for: ${filePath}`);
            await context.octokit.issues.createComment(
            context.issue({
              body: `${filePath}\n${result}`,
            })
          );
          } else {
            app.log.info(`Skipped directory: ${filePath}`);
          }
        } catch (err) {
          app.log.error({ err, file: filePath }, `Failed to fetch content for ${filePath}`);
          await context.octokit.issues.createComment(
            context.issue({
              body: `Emmm, it seems that I struggled to get the content of ${filePath}.`,
            })
          );
        }
      }

      const history_str = JSON.stringify(history, null, 2);
      
      // Use API Gateway service for summary generation
      logger.info('Generating summary from analysis history');
      const summaryResponse = await summaryInvoker({
        summaries: history_str
      });
      logger.info('Summary generation completed successfully');

      await context.octokit.pulls.update({
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name,
        pull_number: prNum,
        body: `${summaryResponse}\n\n---\n\n${context.payload.pull_request.body || ''}`,
      });

    } catch (err) {
      app.log.error({ err }, `Failed to list changed files for PR #${prNum}`);
      await context.octokit.issues.createComment(
        context.issue({
          body: `That's weird, I failed to list changed files for this PR :'(`,
        })
      );
    }
  });

  app.on('pull_request.closed', async (context) => {
  const prNum = context.payload.pull_request.number;
  const fullName = context.payload.repository.full_name;
  const headRef = context.payload.pull_request.head.ref;

  if (!context.payload.pull_request.merged) return;
  if (headRef.endsWith('_documented') || headRef.startsWith('docs_')) return;

  app.log.info(`Detected merged PR #${prNum} in ${fullName}`);

  await context.octokit.issues.createComment(
    context.issue({
      body: "Processing pull request changes...",
    })
  );

  try {
    // Retrieve list of changed files in the PR
    const { data: files } = await context.octokit.rest.pulls.listFiles({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      pull_number: prNum,
    });

    await context.octokit.issues.createComment(
      context.issue({
        body: `Analyzing ${files.length} changed file(s). This may take a short while.`,
      })
    );

    // Get base branch (e.g., main)
    const baseBranch = context.payload.pull_request.base.ref;

    for (const file of files) {
      const filePath = file.filename;
      app.log.info(`Changed file: ${filePath}`);

      try {
        const { data } = await context.octokit.rest.repos.getContent({
          owner: context.payload.repository.owner.login,
          repo: context.payload.repository.name,
          path: filePath,
          ref: headRef,
        });

        if (!Array.isArray(data)) {
          const content = Buffer.from(data.content, "base64").toString("utf8");

          // Generate unique file name for documentation Lambda
          const uniqueFileNameForDocs = generateUniqueFileName(filePath, prNum, context.payload.repository.name);
          
          // Upload content to S3 for documentation generation
          await uploadToS3({ fileName: uniqueFileNameForDocs, fileContent: content });
          app.log.info(`Uploaded file for documentation: ${uniqueFileNameForDocs}`);

          // Send file to API Gateway for documentation generation
          logger.info(`Generating documentation for: ${filePath}`);
          const documentedContent = await documentationInvoker({
            file_id: uniqueFileNameForDocs
          });
          logger.info(`Documentation generation completed for: ${filePath}`);
          logger.info(`Documentation generation : ${documentedContent}`);

          // Define branch name based on file with timestamp to avoid conflicts
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const sanitizedPath = filePath.replace(/[/\\]/g, "_").replace(/[^a-zA-Z0-9_-]/g, '');
          const branchName = `docs_${sanitizedPath}_${timestamp}`;

          // Retrieve latest commit from base branch
          const { data: refData } = await context.octokit.git.getRef({
            owner: context.payload.repository.owner.login,
            repo: context.payload.repository.name,
            ref: `heads/${baseBranch}`,
          });

          const latestCommitSha = refData.object.sha;

          // Delete branch if it exists (better error handling)
          try {
            await context.octokit.git.deleteRef({
              owner: context.payload.repository.owner.login,
              repo: context.payload.repository.name,
              ref: `heads/${branchName}`,
            });
            app.log.info(`Deleted existing branch: ${branchName}`);
            // Wait a moment for GitHub to process the deletion
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (e) {
            app.log.info(`No existing branch to delete: ${branchName}`);
          }

          // Create new branch from base
          try {
            await context.octokit.git.createRef({
              owner: context.payload.repository.owner.login,
              repo: context.payload.repository.name,
              ref: `refs/heads/${branchName}`,
              sha: latestCommitSha,
            });
            app.log.info(`Created new branch: ${branchName}`);
          } catch (createError) {
            app.log.error(`Failed to create branch ${branchName}:`, createError);
            throw createError;
          }

          // Create a new blob for the documented file
          const { data: blob } = await context.octokit.git.createBlob({
            owner: context.payload.repository.owner.login,
            repo: context.payload.repository.name,
            content: documentedContent,
            encoding: "utf-8",
          });

          // Build new tree with the documented file
          const { data: baseCommit } = await context.octokit.git.getCommit({
            owner: context.payload.repository.owner.login,
            repo: context.payload.repository.name,
            commit_sha: latestCommitSha,
          });

          const { data: newTree } = await context.octokit.git.createTree({
            owner: context.payload.repository.owner.login,
            repo: context.payload.repository.name,
            base_tree: baseCommit.tree.sha,
            tree: [
              {
                path: filePath,
                mode: "100644",
                type: "blob",
                sha: blob.sha,
              },
            ],
          });

          // Create commit with documented file
          const { data: newCommit } = await context.octokit.git.createCommit({
            owner: context.payload.repository.owner.login,
            repo: context.payload.repository.name,
            message: `docs: add documentation for ${filePath}`,
            tree: newTree.sha,
            parents: [latestCommitSha],
          });

          // Update branch reference with new commit
          await context.octokit.git.updateRef({
            owner: context.payload.repository.owner.login,
            repo: context.payload.repository.name,
            ref: `heads/${branchName}`,
            sha: newCommit.sha,
            force: true,
          });

          // Create a pull request for the documented branch
          try {
            const pr = await context.octokit.pulls.create({
              owner: context.payload.repository.owner.login,
              repo: context.payload.repository.name,
              title: `Docs for ${filePath}`,
              head: branchName,
              base: baseBranch,
              body: `## Automated Documentation

This PR contains AI-generated documentation for \`${filePath}\`.

### Changes:
- Added comprehensive documentation and comments
- Improved code readability
- Generated from PR #${prNum}

### Generated Documentation:
The documentation was automatically generated using AI analysis of the code structure and functionality.

---
*This is an automated documentation update generated by SimpleFlow Bot.*`,
              maintainer_can_modify: true,
            });

            await context.octokit.issues.createComment(
              context.issue({
                body: `📚 Created documentation branch \`${branchName}\` with documented version of \`${filePath}\`.\n\n🔗 Pull Request: #${pr.data.number} - [View Documentation PR](${pr.data.html_url})`,
              })
            );

            app.log.info(`Created documentation PR #${pr.data.number} for ${filePath}`);
          } catch (prError) {
            app.log.error(`Failed to create PR for documented branch ${branchName}:`, prError);
            
            // Fallback to just creating the branch
            await context.octokit.issues.createComment(
              context.issue({
                body: `📚 Created documentation branch \`${branchName}\` with documented version of \`${filePath}\`.\n\n⚠️ Could not create pull request automatically. You can manually create a PR from the branch.`,
              })
            );
          }
        } else {
          app.log.info(`Skipped directory: ${filePath}`);
        }
      } catch (err) {
        app.log.error({ err, file: filePath }, `Failed to process ${filePath}`);
        
        let errorMessage = `Failed to create documentation for \`${filePath}\`.`;
        
        if (err.message.includes('Lambda')) {
          errorMessage += '\n\n🔧 **Issue**: Lambda function error - the AI documentation service may be temporarily unavailable.';
        } else if (err.message.includes('Git') || err.message.includes('branch')) {
          errorMessage += '\n\n🔧 **Issue**: Git operation failed - there may be branch conflicts or permissions issues.';
        } else if (err.message.includes('S3') || err.message.includes('upload')) {
          errorMessage += '\n\n🔧 **Issue**: File storage error - could not save file for processing.';
        } else {
          errorMessage += `\n\n🔧 **Error**: ${err.message}`;
        }
        
        errorMessage += '\n\n*The SimpleFlow bot will retry this file in the next documentation run.*';
        
        await context.octokit.issues.createComment(
          context.issue({
            body: errorMessage,
          })
        );
      }
    }
  } catch (err) {
    app.log.error({ err }, `Failed to list changed files for PR #${prNum}`);
    await context.octokit.issues.createComment(
      context.issue({
        body: `Failed to list changed files for this pull request.`,
      })
    );
  }
});


  // Opens a PR every time someone installs your app for the first time
  app.on("installation.created", async (context) => {
    // shows all repos you've installed the app on
    context.log.info(context.payload.repositories);

    const owner = context.payload.installation.account.login;

    for (const repository of context.payload.repositories) {
      const repo = repository.name;
      const branch = `sf-initialisation-${Math.floor(Math.random() * 9999)}`;

      // Get current reference in Git
      const reference = await context.octokit.git.getRef({
        repo,
        owner,
        ref: "heads/main",
      });
      // Create a branch
      await context.octokit.git.createRef({
        repo,
        owner,
        ref: `refs/heads/${branch}`,
        sha: reference.data.object.sha,
      });
      // create a new file
      await context.octokit.repos.createOrUpdateFileContents({
        repo,
        owner,
        path: "SIMPLEFLOW.md",
        message: "feat: SimpleFlow has been configured successfully",
        content: Buffer.from("# SimpleFlow\nhttps://github.com/apps/simpleflow-app").toString("base64"),
        branch,
      });
      await context.octokit.pulls.create({
        repo,
        owner,
        title: "feat: SimpleFlow has been configured successfully",
        head: branch,
        base: "master",
        body: "feat: SimpleFlow has been configured successfully",
        maintainer_can_modify: true,
      });
    }
  });

  // Detects when a comment is created in an issue or discussion
  app.on("discussion_comment.created", async (context) => {
    const commentBody = context.payload.comment.body;

    // Check if the comment contains "!sf"
    if (commentBody.includes("!sf")) {
      const owner = context.payload.repository.owner.login;
      const repo = context.payload.repository.name;

      // Use API Gateway service for issue creation
      logger.info('Processing !sf comment for issue creation');
      const issueData = await issueCreationInvoker({
        content: commentBody
      });
      logger.info('Issue creation data generated successfully');

      // Create a new issue
      await context.octokit.issues.create({
        owner,
        repo,
        title: issueData['title'],
        body: issueData['body'],
      });

      context.log.info(`Created a new issue in ${repo} for !sf detection`);
    }
  });

  app.on("issue_comment.created", async (context) => {
    const commentBody = context.payload.comment.body;
    // Check if the comment contains "!sf"
    if (commentBody.includes("!sf")) {
      const owner = context.payload.repository.owner.login;
      const repo = context.payload.repository.name;

      // Get the related issue and its content
      const issueNumber = context.payload.issue.number;
      const issueContent = context.payload.issue.body;

      // Use API Gateway service for issue update
      logger.info('Processing !sf comment for issue update');
      const issueUpdateData = await issueUpdateInvoker({
        issue_content: issueContent,
        issue_comment: commentBody
      });
      logger.info('Issue update data generated successfully');

      // Modify issue title & body
      await context.octokit.issues.update({
        owner,
        repo,
        issue_number: issueNumber,
        title: issueUpdateData['title'],
        body: issueUpdateData['body'],
      });

      await context.octokit.reactions.createForIssueComment({
        owner,
        repo,
        comment_id: context.payload.comment.id,
        content: "eyes",
      });
    }
  });
};
