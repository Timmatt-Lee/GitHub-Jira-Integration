const core = require('@actions/core');
const github = require('@actions/github');
const Jira = require('./services/jira');
const ErrorExit = require('./services/error-exit');

// eslint-disable-next-line import/no-dynamic-require
const githubEvent = require(process.env.GITHUB_EVENT_PATH);

async function main() {
  const host = core.getInput('host');
  const email = core.getInput('email');
  const token = core.getInput('token');
  const project = core.getInput('project');
  const version = core.getInput('version');
  const component = core.getInput('component');
  const type = core.getInput('type');
  const board = core.getInput('board');
  const isCreateIssue = core.getInput('isCreateIssue');

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

  const check = await jira.check();

  console.log(github.context.payload);

  if (!check) {
    ErrorExit.trigger(ErrorExit.INIT);
  }
}

main();
