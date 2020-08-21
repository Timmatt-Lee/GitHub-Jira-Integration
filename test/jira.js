'use strict';

const chai = require('chai')
    .use(require('chai-as-promised'))
    .use(require('sinon-chai'));
const Jira = require('../services/jira');
const ErrorExit = require('../services/error-exit');
require('dotenv').config();

const {
    expect
} = chai;
chai.should();

const host = process.env.HOST;
const email = process.env.EMAIL;
const token = process.env.TOKEN;
const project = process.env.PROJECT;

const jira = new Jira({
    host,
    email,
    token,
    project
});

describe('jira', function () {
    it('init', async function () {
        const result = await jira.check();
        expect(result).to.not.equal(null);
    });

    it('versions', async function () {
        const result = await jira.getVersions();
        expect(result).to.not.equal(null);
    });
});
