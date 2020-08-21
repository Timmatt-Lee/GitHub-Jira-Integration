'use strict';

const core = require('@actions/core');
const github = require('@actions/github');
const Jira = require('./services/jira');
const ErrorExit = require('./services/errorExit');

const payload = JSON.stringify(github.context.payload, undefined, 2)

const githubEvent = require(process.env.GITHUB_EVENT_PATH);

async function main() {
	const host = core.getInput('host');
	const token = core.getInput('token');
	const email = core.getInput('email');

	const jira = new Jira({
		host,
		email,
		token
	});

	const check = await jira.check();

	if (!check) {
		new ErrorExit(ErrorExit.INIT);
	}
}

main()
