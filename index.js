'user strict';

const core = require('@actions/core');
const github = require('@actions/github');
const Github = require('./services/github');
const Jira = require('./services/jira');
const request = require('./services/request');

async function main() {
  const webhook = core.getInput('webhook');
  const host = core.getInput('host');
  const email = core.getInput('email');
  const token = core.getInput('token');
  const project = core.getInput('project');
  let transition = core.getInput('transition');
  const githubToken = core.getInput('githubToken');
  const version = core.getInput('version');
  const component = core.getInput('component');
  const type = core.getInput('type');
  const board = core.getInput('board');
  const isOnlyTransition = core.getInput('isOnlyTransition').toLowerCase() === 'true';
  let isCreateIssue = core.getInput('isCreateIssue').toLowerCase() === 'true';
  const otherAssignedTransition = core.getInput('otherAssignedTransition');
  const isAssignToReporter = core.getInput('isAssignToReporter').toLowerCase() === 'true';

  if (isOnlyTransition) isCreateIssue = false;

  if (isCreateIssue && !type) {
    throw new Error('Creating issue need type');
  }

  const gitService = new Github(github, githubToken);

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

  const keyWithBracket = pr.title.match(`\\[${project}-\\d+\\]`);
  if (keyWithBracket) {
    // if title has a [AB-1234] like Jira issue key
    key = keyWithBracket[0].substring(1, keyWithBracket[0].length - 1);
    if (webhook) {
      await request({ url: webhook, method: 'post', body: { issues: [key], pr } });
      await gitService.updatePR({ body: `[${key}](${host}/browse/${key})\n${pr.body}` });
    }
  } else {
    if (isOnlyTransition || webhook) { core.info('No jira issue detected in PR title'); process.exit(0); }
    if (!isCreateIssue) { core.info('Nothing process'); process.exit(0); }

    const userId = await jira.getUserIdByFuzzyName(github.context.actor).catch(core.info);

    const issue = await jira.postIssue(pr.title, userId);
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

  // reporter and assignee are identical in a new created issue
  // so only focus on an existed issue
  if (keyWithBracket && otherAssignedTransition) {
    const isMeCreatedIssue = await jira.isMeCreatedIssue(key);
    if (!isMeCreatedIssue) transition = otherAssignedTransition;
  }

  if (isAssignToReporter) await jira.putAssignIssue(key, await jira.getIssueReporterId(key));

  await jira.postTransitIssue(key, transition);

  if (isOnlyTransition) { core.info('transit completed'); process.exit(0); }

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
  const newPR = { body: `[${key}](${host}/browse/${key})\n${pr.body}` };
  // if title has no jira issue, insert it
  if (!keyWithBracket) { newPR.title = `[${key}] ${pr.title}`; }

  await gitService.updatePR(newPR);

  core.info('New issue created');
}

main().catch(core.setFailed);
