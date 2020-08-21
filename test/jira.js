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

const jira = new Jira({
    host,
    email,
    token
});

describe('jira', function () {
    it('init', async function () {
        const check = await jira.check();
        expect(check).to.not.equal(null);
    });
});
