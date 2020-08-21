'user strict';

const axios = require('axios');
const core = require('@actions/core');

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
    const { id } = versions.find((v) => v.name.startsWith(this.version));
    return id;
  }

  async postIssue(summary) {
    const id = await this.getVersionIdByPrefix();
    return this.request('/rest/api/3/issue', 'post', {
      fields: {
        summary,
        project: {
          key: this.project,
        },
        issuetype: {
          name: this.type,
        },
        components: [
          {
            name: this.component,
          },
        ],
        fixVersions: [
          {
            id,
          },
        ],
      },
    });
  }

  async getTransitions(issue) {
    return this.request(`/rest/api/3/issue/${issue}/transitions`);
  }

  async getTransitionIdByName(issue, name) {
    const { transitions } = await this.getTransitions(issue);
    const { id } = transitions.find((t) => t.name === name);
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

  async request(api, method = 'get', data = {}) {
    const url = `${this.host}${api}`;

    const { data: result } = await axios({
      url,
      method,
      data,
      auth: {
        username: this.email,
        password: this.token,
      },
    }).catch((e) => core.setFailed(JSON.stringify(e)));

    return result;
  }
}

module.exports = Jira;
