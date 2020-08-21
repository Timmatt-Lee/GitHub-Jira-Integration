'user strict';

const axios = require('axios');
const joi = require('joi');
const ErrorExit = require('./error-exit');

class Jira {
    constructor({
        host,
        email,
        token,
        project,
    }) {
        this.host = host;
        this.token = token;
        this.email = email;
        this.project = project;
    }

    async check() {
        return this.request('/rest/api/3/myself');
    }

    async getVersions() {
        return this.request(`/rest/api/3/project/${this.project}/versions`)
    }

    async createIssue() {
        return this.request('/rest/api/3/issue');
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
