'use strict';

const core = require('@actions/core');
const Jira = require('./services/jira');

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
		throw new Error('Jira init error');
	}
}

main()
