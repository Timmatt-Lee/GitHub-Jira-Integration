'user strict';

const axios = require('axios');
const joi = require('joi');

class Jira {
    constructor({
        host,
        email,
        token
    }) {
        this.host = host;
        this.token = token;
        this.email = email;
    }

    async check() {
        return this.request('/rest/api/3/myself');
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
        }).catch(console.error);

        return result;
    }
}

module.exports = Jira;
