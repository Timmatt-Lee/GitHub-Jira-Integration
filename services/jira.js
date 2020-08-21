'user strict';

const axios = require('axios');
const ErrorExit = require('./error-exit');

class Jira {
  constructor({
    host,
    email,
    token,
    project,
    version,
    component,
    type,
  }) {
    this.host = host;
    this.token = token;
    this.email = email;
    this.project = project;
    this.version = version;
    this.component = component;
    this.type = type;
  }

  async check() {
    return this.request('/rest/api/3/myself');
  }

  async getVersions() {
    return this.request(`/rest/api/3/project/${this.project}/versions`);
  }

  async getVersionIdByPrefix() {
    const { data: versions } = await this.getVersions();
    const { id } = versions.find((v) => v.name.startsWith(this.version));
    return id;
  }

  async createIssue(summary) {
    const versionId = await this.getVersionIdByPrefix();
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
            id: versionId,
          },
        ],
      },
    });
  }

  async request(api, method = 'get', data = {}) {
    const url = `${this.host}${api}`;

    const result = await axios({
      url,
      method,
      data,
      auth: {
        username: this.email,
        password: this.token,
      },
    }).catch(ErrorExit.trigger);

    return result;
  }
}

module.exports = Jira;
