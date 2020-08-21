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
    const issue = await jira.postIssue(github.context.payload.pull_request.title);

    await jira.postTransitIssue(issue.key, transition);

    await jira.postComment(issue.key, {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'blockCard',
          attrs: {
            url: github.context.payload.pull_request.html_url,
          },
        },
      ],
    });

    const { values: [{ activeSprintId }] } = await jira.getSprints('active');

    console.log(await jira.getSprints('active'));

    await jira.postMoveIssuesToSprint([issue.key], activeSprintId);
  } catch (e) { core.setFailed(e); }
}

main();
