const github = require('@actions/github');

class Github {
  constructor({
    context,
    token,
  }) {
    this.context = context;
    this.octokit = github.getOctokit(token);
  }

  async updatePR(obj) {
    const newPR = {
      owner: this.context.repo.owner,
      repo: this.context.repo.repo,
      pull_number: this.context.pull_request.number,
      ...obj,
    };

    const res = await this.octokit.pulls.update(newPR);
    if (res.status !== 200) Promise.reject(JSON.stringify(res));
  }
}

module.exports = Github;
