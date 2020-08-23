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
const board = process.env.BOARD;

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

describe('jira', () => {
  it('init', async () => {
    const data = await jira.check();
    expect(data).to.not.equal(null);
  });

  it('versions', async () => {
    const data = await jira.getVersions();
    expect(data).to.not.equal(null);
  });

  it('versionId', async () => {
    const id = await jira.getVersionIdByPrefix();
    expect(id).to.not.equal(null);
  });

  it('create issue', async () => {
    const data = await jira.postIssue('title of issue');
    expect(data).to.not.equal(null);
  });

  it('sprints', async () => {
    const data = await jira.getSprints();
    expect(data).to.not.equal(null);
  });

  it('active sprint', async () => {
    const { values: [{ id }] } = await jira.getSprints('active');
    expect(id).to.not.equal(null);
  });

  it('user id', async () => {
    const id = await jira.getUserIdByName(process.env.NAME);
    expect(id).to.not.equal(null);
  });

  it('user id by fuzzy search', async () => {
    const id = await jira.getUserIdByFuzzyName(process.env.NAME);
    expect(id).to.not.equal(null);
  });
});

describe('jira issue', () => {
  beforeEach(async () => {
    const issue = await jira.postIssue('title of issue');
    this.issue = issue;
  });

  it('all transitions', async () => {
    const data = await jira.getTransitions(this.issue.key);
    expect(data).to.not.equal(null);
  });

  it('transition id', async () => {
    const id = await jira.getTransitionIdByName(this.issue.key, process.env.TRANSITION);
    expect(id).to.not.equal(null);
  });

  it('transit issue', async () => {
    const data = await jira.postTransitIssue(this.issue.key, process.env.TRANSITION);
    expect(data).to.not.equal(null);
  });

  it('comment with a github pull request block', async () => {
    const data = await jira.postComment(this.issue.key, {
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
    expect(data).to.not.equal(null);
  });

  it('move to active sprint', async () => {
    const { values: [{ id }] } = await jira.getSprints('active');

    const data = await jira.postMoveIssuesToSprint([this.issue.key], id);
    expect(data).to.not.equal(null);
  });

  it('is mine created issue', async () => {
    const yes = await jira.isMeCreatedIssue(this.issue.key);
    expect(yes).equal(true);
  });

  it('assign to none', async () => {
    await jira.putAssignIssue(this.issue.key, null);
    const a = await jira.getIssueAssigneeId(this.issue.key);
    expect(a).equal(null);
  });
});
