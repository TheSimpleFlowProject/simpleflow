// Git Data API use case example
// See: https://developer.github.com/v3/git/ to learn more

/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Probot} app
 */
module.exports = (app) => {
  app.on('pull_request.opened', async (context) => {
    const prNum = context.payload.pull_request.number;
    const fullName = context.payload.repository.full_name;
    const headRef = context.payload.pull_request.head.ref;

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
    } catch (err) {
      app.log.error({ err }, `Failed to list changed files for PR #${prNum}`);
      await context.octokit.issues.createComment(
        context.issue({
          body: `That's weird, I failed to list changed files for this PR :'(`,
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

      // Generates a random number to ensure the git reference isn't already taken
      // NOTE: this is not recommended and just shows an example so it can work :)

      // test
      const branch = `new-branch-${Math.floor(Math.random() * 9999)}`;

      // Get current reference in Git
      const reference = await context.octokit.git.getRef({
        repo, // the repo
        owner, // the owner of the repo
        ref: "heads/main",
      });
      // Create a branch
      await context.octokit.git.createRef({
        repo,
        owner,
        ref: `refs/heads/${branch}`,
        sha: reference.data.object.sha, // accesses the sha from the heads/master reference we got
      });
      // create a new file
      await context.octokit.repos.createOrUpdateFileContents({
        repo,
        owner,
        path: "path/to/your/file.md", // the path to your config file
        message: "adds config file", // a commit message
        content: Buffer.from("My new file is awesome!").toString("base64"),
        // the content of your file, must be base64 encoded
        branch, // the branch name we used when creating a Git reference
      });
      // create a PR from that branch with the commit of our added file
      await context.octokit.pulls.create({
        repo,
        owner,
        title: "Adding my file!", // the title of the PR
        head: branch, // the branch our chances are on
        base: "master", // the branch to which you want to merge your changes
        body: "Adds my new file!", // the body of your PR,
        maintainer_can_modify: true, // allows maintainers to edit your app's PR
      });
    }
  });
  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
};