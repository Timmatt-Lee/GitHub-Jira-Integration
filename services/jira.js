const Fuse = require('fuse.js');
const request = require('./request');

class Jira {
  constructor({
    host,
    email,
    token,
    project,
    version,
    component,
    type,
    board,
  }) {
    this.host = host;
    this.token = token;
    this.email = email;
    this.project = project;
    this.version = version;
    this.component = component;
    this.type = type;
    this.board = board;
  }

  async check() {
    return this.request('/rest/api/3/myself');
  }

  async getVersions() {
    return this.request(`/rest/api/3/project/${this.project}/versions`);
  }

  async getVersionIdByPrefix() {
    const versions = await this.getVersions();
    const v = versions.find((_) => _.name.startsWith(this.version) && !_.released);
    if (!v) throw new Error('Version prefix not found');
    const { id } = v;
    return id;
  }

  async postIssue(summary, userId) {
    const data = {
      fields: {
        summary,
        project: {
          key: this.project,
        },
      },
    };
    if (this.type) data.fields.issuetype = { name: this.type };
    if (this.component) data.fields.components = [{ name: this.component }];
    if (this.version) {
      const id = await this.getVersionIdByPrefix();
      data.fields.fixVersions = [{ id }];
    }
    if (userId) {
      data.fields.reporter = { id: userId };
      data.fields.assignee = { id: userId };
    }
    return this.request('/rest/api/3/issue', 'post', data);
  }

  async getTransitions(issue) {
    return this.request(`/rest/api/3/issue/${issue}/transitions`);
  }

  async getTransitionIdByName(issue, name) {
    const { transitions } = await this.getTransitions(issue);
    const t = transitions.find((_) => _.name === name);
    if (!t) throw new Error('This issue cannot move to this transition');
    const { id } = t;
    return id;
  }

  async postTransitIssue(issue, name) {
    const id = await this.getTransitionIdByName(issue, name);
    return this.request(`/rest/api/3/issue/${issue}/transitions`, 'post', {
      transition: {
        id,
      },
    });
  }

  async postComment(issue, body) {
    return this.request(`/rest/api/3/issue/${issue}/comment`, 'post', {
      body,
    });
  }

  async getSprints(state) {
    const url = `/rest/agile/1.0/board/${this.board}/sprint`;
    if (state) {
      return this.request(`${url}?state=${state}`);
    }
    return this.request(url);
  }

  async postMoveIssuesToSprint(issues, id) {
    return this.request(`/rest/agile/1.0/sprint/${id}/issue`, 'post', {
      issues,
    });
  }

  async getUserIdByName(name) {
    const [{ accountId }] = await this.request(`/rest/api/3/user/search?query=${name}`);
    if (!accountId) throw new Error('User not found by name');
    return accountId;
  }

  async getAllUsers() {
    return this.request('/rest/api/3/users/search?maxResults=10000');
  }

  async getUserIdByFuzzyName(name) {
    const users = await this.getAllUsers();
    const fuse = new Fuse(users, {
      keys: ['displayName'],
    });
    const [result] = fuse.search(name);
    if (!result) throw new Error('User not found by fuzzy name');
    return result.item.accountId;
  }

  async getIssue(key) {
    return this.request(`/rest/api/3/issue/${key}`);
  }

  async getIssueAssigneeId(key) {
    const { fields } = await this.getIssue(key);
    if (!fields.assignee) return null;

    return fields.assignee.accountId;
  }

  async getIssueReporterId(key) {
    const { fields } = await this.getIssue(key);
    if (!fields.reporter) return null;

    return fields.reporter.accountId;
  }

  async isMeCreatedIssue(key) {
    const assigneeId = await this.getIssueAssigneeId(key);
    const reporterId = await this.getIssueReporterId(key);
    if (!assigneeId && !reporterId) return false;
    return assigneeId === reporterId;
  }

  async getIssueSummary(key) {
    const { fields: { summary } } = await this.getIssue(key);

    return summary;
  }

  async putAssignIssue(key, accountId) {
    return this.request(`/rest/api/3/issue/${key}/assignee`, 'put', { accountId });
  }

  async putFixVersion(key, versionId) {
    return this.request(`/rest/api/3/issue/${key}`, 'put', {
      fields: {
        fixVersions: [
          {
            id: versionId,
          },
        ],
      },
    });
  }

  async request(api, method = 'get', data = {}) {
    return request({
      url: `${this.host}${api}`,
      method,
      data,
      auth: {
        username: this.email,
        password: this.token,
      },
    });
  }
}

module.exports = Jira;
