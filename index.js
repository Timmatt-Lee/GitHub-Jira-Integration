'user strict';

const core = require('@actions/core');
const github = require('@actions/github');
const Jira = require('./services/jira');

async function main() {
  const host = core.getInput('host', { required: true });
  const email = core.getInput('email', { required: true });
  const token = core.getInput('token', { required: true });
  const project = core.getInput('project', { required: true });
  const transition = core.getInput('transition', { required: true });
  const githubToken = core.getInput('githubToken', { required: true });
  const version = core.getInput('version');
  const component = core.getInput('component');
  const type = core.getInput('type');
  const board = core.getInput('board');
  const isOnlyTransition = core.getInput('isOnlyTransition').toLowerCase() === 'true';
  let isCreateIssue = core.getInput('isCreateIssue').toLowerCase() === 'true';

  if (isOnlyTransition) isCreateIssue = false;

  if (isCreateIssue && !type) {
    throw new Error('Creating issue need type');
  }

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

  const pr = github.context.payload.pull_request;
  if (!pr) {
    core.setFailed('Only support pull request trigger');
  }

  let key = '';

  // if title has a [AB-1234] like Jira issue key
  const keyWithBracket = pr.title.match(`\\[${project}-\\d+\\]`);
  if (keyWithBracket) {
    key = keyWithBracket[0].substring(1, keyWithBracket[0].length - 1);
  } else {
    if (!isCreateIssue) { process.exit(0); }
    if (isOnlyTransition) { throw new Error('Need a valid Jira issue key in your title'); }

    const userId = await jira.getUserIdByFuzzyName(github.context.actor).catch(core.info);

    const issue = await jira.postIssue(githubToken, userId);
    key = issue.key;

    if (board) {
      // move card to active sprint
      const { values: [{ id: activeSprintId }] } = await jira.getSprints('active');
      await jira.postMoveIssuesToSprint([key], activeSprintId);
    }
  }

  if (!key) {
    core.setFailed('Issue key parse error');
  }

  await jira.postTransitIssue(key, transition);

  if (isOnlyTransition) { process.exit(0); }

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
    body: `[${key}](${host}/browse/${key})\n${pr.body}`,
  };

  // if title has no jira issue, insert it
  if (!keyWithBracket) {
    newPR.title = `[${key}] ${pr.title}`;
  }

  const octokit = github.getOctokit(githubToken);
  octokit.pulls.update(newPR).then((res) => {
    if (res.status !== 200) core.setFailed(JSON.stringify(res));
  });
}

main().catch(core.setFailed);
