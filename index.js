'user strict';

const core = require('@actions/core');
const github = require('@actions/github');
const Github = require('./services/github');
const Jira = require('./services/jira');
const request = require('./services/request');

async function main() {
  const githubToken = core.getInput('githubToken', { required: true });
  const webhook = core.getInput('webhook');
  const host = core.getInput('host', { required: true });
  const email = core.getInput('email');
  const token = core.getInput('token');
  const project = core.getInput('project');
  let transition = core.getInput('transition');
  const version = core.getInput('version');
  const component = core.getInput('component');
  const type = core.getInput('type');
  const board = core.getInput('board');
  const isOnlyTransition = core.getInput('isOnlyTransition').toLowerCase() === 'true';
  const isCreateIssue = core.getInput('isCreateIssue').toLowerCase() === 'true';
  const otherAssignedTransition = core.getInput('otherAssignedTransition');
  const isAssignToReporter = core.getInput('isAssignToReporter').toLowerCase() === 'true';
  const isOnlyAppendDesc = core.getInput('isOnlyAppendDesc').toLowerCase() === 'true';
  const appendDescAfterRegex = core.getInput('appendDescAfterRegex');

  const gitService = new Github({ github, githubToken });

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

  // `AB-1234` Jira issue key
  let [key] = pr.title.match('\\w+-\\d+');
  // no key detected in title, find in branch name
  core.info(pr);
  if (!key) [key] = pr.head.ref.match('\\w+-\\d+');

  // project = key.substring(0, key.indexOf('-'));

  if (webhook) {
    await request({ url: webhook, method: 'post', data: { issues: [key], pr } });
    await gitService.updatePR({ body: `[${key}](${host}/browse/${key})\n${pr.body}` });
    core.info('webhook complete');
    process.exit(0);
  }

  if (isOnlyAppendDesc) {
    let from = 0;
    if (appendDescAfterRegex) {
      from = pr.body.search(appendDescAfterRegex);
    }

    const body = `
      ${pr.body.slice(0, from)}
      [\${key}](\${host}/browse/\${key})
      ${from === 0 ? '\n' : ''}
      ${pr.body.slice(from)}`;

    await gitService.updatePR({ body });
  }

  if (isCreateIssue) {
    if (!project) throw new Error('Creating issue need project');
    if (!type) throw new Error('Creating issue need type');

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
    core.info('No jira issue detected in PR title/branch');
    process.exit(0);
  }

  // transit issue
  if (otherAssignedTransition) {
    const isMeCreatedIssue = await jira.isMeCreatedIssue(key);
    // if issue was assigned by other
    if (!isMeCreatedIssue) transition = otherAssignedTransition;
  }
  if (transition) {
    await jira.postTransitIssue(key, transition);
  }

  if (isOnlyTransition) {
    core.info('transit completed');
    process.exit(0);
  }

  if (isAssignToReporter) {
    await jira.putAssignIssue(key, await jira.getIssueReporterId(key));
  }

  // comment on jira with this pr
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
  if (isCreateIssue) { newPR.title = `[${key}] ${pr.title}`; }

  await gitService.updatePR(newPR);

  core.info('New issue created');
}

main().catch(core.setFailed);
