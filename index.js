const core = require('@actions/core');
const github = require('@actions/github');
const Jira = require('./services/jira');

async function main() {
  const host = core.getInput('host');
  const email = core.getInput('email');
  const token = core.getInput('token');
  const project = core.getInput('project');
  const version = core.getInput('version');
  const component = core.getInput('component');
  const type = core.getInput('type');
  const board = core.getInput('board');
  const transition = core.getInput('transition');
  const githubToken = core.getInput('githubToken');

  const jira = new Jira({
    host,
    email,
    token,
    project,
    version,
    component,
    type,
    board,
  });

  try {
    const pr = github.context.payload.pull_request;
    if (!pr) {
      core.setFailed('Only support pull request trigger');
    }

    let key = '';

    // if title has a [AB-1234] like Jira issue tag
    const keyWithBracket = pr.title.match(`\\[${project}-\\d+\\]`);
    if (keyWithBracket) {
      key = keyWithBracket[0].substring(1, keyWithBracket[0].length - 1);
    } else {
      const issue = await jira.postIssue(pr.title);
      key = issue.key;

      // move card to active sprint
      const { values: [{ id: activeSprintId }] } = await jira.getSprints('active');
      await jira.postMoveIssuesToSprint([key], activeSprintId);
    }

    await jira.postTransitIssue(key, transition);

    await jira.postComment(key, {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'blockCard',
          attrs: {
            url: pr.html_url,
          },
        },
      ],
    });

    // update pull request title and desc
    const newPR = {
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      pull_number: pr.number,
      title: `[${key}] ${pr.title}`,
      body: `[${key}](${host}/browse/${key})\n${pr.body}`,
    };

    // if title already has jira issue, no need to update it
    // if (keyWithBracket) {
    //   delete newPR.title;
    // }

    const octokit = github.getOctokit(githubToken);
    const response = await octokit.pulls.update(newPR);

    if (response.status !== 200) { core.setFailed(JSON.stringify(response)); }
  } catch (e) { core.setFailed(e); }
}

main();
