const chai = require('chai')
  .use(require('chai-as-promised'))
  .use(require('sinon-chai'));
const Jira = require('../services/jira');
require('dotenv').config();

const {
  expect,
} = chai;
chai.should();

const host = process.env.HOST;
const email = process.env.EMAIL;
const token = process.env.TOKEN;
const project = process.env.PROJECT;
const version = process.env.VERSION;
const component = process.env.COMPONENT;
const type = process.env.TYPE;

const jira = new Jira({
  host,
  email,
  token,
  project,
  version,
  component,
  type,
});

describe('jira', () => {
  it('init', async () => {
    const { status } = await jira.check();
    expect(status).equal(200);
  });

  it('versions', async () => {
    const { status } = await jira.getVersions();
    expect(status).equal(200);
  });

  it('versionId', async () => {
    const id = await jira.getVersionIdByPrefix();
    expect(id).to.not.equal(null);
  });

  it('create issue', async () => {
    const { status } = await jira.postIssue('title of issue');
    expect(status).equal(201);
  });
});

describe('jira issue', () => {
  beforeEach(async () => {
    const { data: issue } = await jira.postIssue('title of issue');
    this.issue = issue;
  });

  it('all transitions', async () => {
    const { status } = await jira.getTransitions(this.issue.key);
    expect(status).equal(200);
  });

  it('transition id', async () => {
    const id = await jira.getTransitionIdByName(this.issue.key, process.env.TRANSITION);
    expect(id).to.not.equal(null);
  });

  it('transit issue', async () => {
    const { status } = await jira.postTransitIssue(this.issue.key, process.env.TRANSITION);
    expect(status).equal(204);
  });

  it('comment with a github pull request block', async () => {
    const { status } = await jira.postComment(this.issue.key, {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'blockCard',
          attrs: {
            url: 'https://github.com/Timmatt-Lee/Github-Jira-Integration/pull/1',
          },
        },
      ],
    });
    expect(status).equal(201);
  });
});
