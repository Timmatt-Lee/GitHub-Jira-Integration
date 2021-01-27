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
  const isAddFixVersionOnMerge = core.getInput('isAddFixVersionOnMerge').toLowerCase() === 'true';

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
  const foundInTitle = pr.title.match('\\w+-\\d+');
  let key;
  if (foundInTitle) [key] = foundInTitle;
  // no key detected in title, find in branch name
  if (!key) {
    const foundInBranch = pr.head.ref.match('\\w+-\\d+');
    if (foundInBranch)[key] = foundInBranch;
  }

  // project = key.substring(0, key.indexOf('-'));

  let issueTitle;
  if (email && token && key) {
    issueTitle = await jira.getIssueSummary(key);
  }

  if (webhook) {
    if (!key) {
      core.info('No jira issue detected in PR title/branch');
      process.exit(0);
    }

    const rrr = await request({ url: webhook, method: 'post', data: { issues: [key], pr } });
    core.info(rrr);
    core.info('webhook complete1');

    if (isAddFixVersionOnMerge) {
      const versionId = await jira.getVersionIdByPrefix(version);
      core.info(versionId);

      const r = await jira.putFixVersion(key, versionId);
      core.info(r);
      core.info('version complete');
      process.exit(0);
    }

    if (pr.merged) {
      process.exit(0);
    }

    if (foundInTitle) {
      await gitService.updatePR({
        body: `[${key}${issueTitle ? `: ${issueTitle}` : ''}](${host}/browse/${key})\n${pr.body}`,
      });
    } else {
      // issue name not existed in title, update it
      await gitService.updatePR({
        title: `[${key}] ${pr.title}`,
        body: `[${key}${issueTitle ? `: ${issueTitle}` : ''}](${host}/browse/${key})\n${pr.body}`,
      });
    }

    if (email && token) {
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
    }

    process.exit(0);
  }

  if (isOnlyAppendDesc) {
    let from = 0;
    let length = 0;
    if (appendDescAfterRegex) {
      from = pr.body.search(appendDescAfterRegex);
      if (from === -1) {
        from = 0;
      } else {
        const [word] = pr.body.match(appendDescAfterRegex);
        length = word.length;
      }
    }

    const body = `${pr.body.slice(0, from + length)}${from === 0 ? '' : ' '}[${key}${foundInTitle ? `: ${issueTitle}` : ''}](${host}/browse/${key})${from === 0 ? '\n' : ''}${pr.body.slice(from + length)}`;

    await gitService.updatePR({ body });
    core.info('update PR description complete');
    process.exit(0);
  }

  if (isCreateIssue) {
    if (!project) throw new Error('Creating issue need project');
    if (!type) throw new Error('Creating issue need type');

    const userId = await jira.getUserIdByFuzzyName(github.context.actor).catch(core.info);

    const issue = await jira.postIssue(pr.title, userId);
    key = issue.key;
    issueTitle = pr.title;

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
  const newPR = { body: `[${key}${foundInTitle ? `: ${issueTitle}` : ''}](${host}/browse/${key})\n${pr.body}` };
  // if title has no jira issue, insert it
  if (isCreateIssue || !foundInTitle) { newPR.title = `[${key}] ${pr.title}`; }

  await gitService.updatePR(newPR);

  core.info('New issue created');
}

main().catch(core.setFailed);
