# Github-Jira-Integration

[![GitHub Release](https://img.shields.io/github/release/tterb/PlayMusic.svg?style=flat)](https://github.com/Timmatt-Lee/Github-Jira-Integration/releases/latest)

Tired of switching tabs between GitHub and Jira? With this GitHub Action, a pull request will transit Jira issue and bind links on each other; resolve it once merged.

## Demo

### Pull Request and Create Jira issue

1. create a pull request
![create-jira-issue(github-before)](img/create-jira-issue(github-before).jpg)
1. auto insert created issue key into title and desc
![create-jira-issue(github-after)](img/create-jira-issue(github-after).jpg)
1. auto create Jira issue with same title
1. and `component`, `fix version`, `active sprint`
1. record github pull request url
![create-jira-issue(jira-after)](img/create-jira-issue(jira-after).jpg)

### Pull Request with Existed Jira issue

1. here is a existed Jira issue
![existed-jira-issue(jira-before)](img/existed-jira-issue(jira-before).jpg)
1. create a pull request titled with Jira issue key
![existed-jira-issue(github-before)](img/existed-jira-issue(github-before).jpg)
1. auto insert Jira issue link into desc
![existed-jira-issue(github-after)](img/existed-jira-issue(github-after).jpg)
1. auto transit Jira issue
1. record github pull request url
![existed-jira-issue(jira-after)](img/existed-jira-issue(jira-after).jpg)

### Merge and Resolve Jira issue

1. after merging pull request
1. corresponding Jira issue got auto transited
![resolve-jira-issue(jira-after)](img/resolve-jira-issue(jira-after).jpg)

## Usage

### Create GitHub Action

Create `.github/workflows/pr-jira.yml`:

```{yml}
on:
  pull_request:
    types: [opened]
    branches:
      - master

name: Pull Request and Jira issue integration

jobs:
  jira:
    name: Pull Request and Jira issue integration
    runs-on: ubuntu-latest
    steps:
    - name: Integration
      uses: Timmatt-Lee/Github-Jira-Integration@master
      with:
        host: ${{ secrets.JIRA_BASE_URL }}
        email: ${{ secrets.JIRA_USER_EMAIL }}
        token: ${{ secrets.JIRA_API_TOKEN }}
        githubToken: ${{ secrets.GITHUB_TOKEN }}
        project: ${{ secrets.JIRA_PROJECT_NAME }}
        version: ${{ secrets.JIRA_VERSION_PREFIX }}
        component: ${{ secrets.JIRA_COMPONENT_NAME }}
        type: ${{ secrets.JIRA_ISSUE_TYPE }}
        board: ${{ secrets.JIRA_BOARD_ID }}
        transition: ${{ secrets.JIRA_PR_TRANSITION_NAME }}
        # add below if you don't want auto create
        isNotCreateIssue: false
```

Create `.github/workflows/merge-jira.yml`:

```{yml}
on:
  pull_request:
    types: [closed]
    branches:
      - master

name: Merge and resolve Jira issue

jobs:
  jira:
    name: Merge and resolve Jira issue
    if: github.event.pull_request.merged
    runs-on: ubuntu-latest
    steps:
    - name: Integration
      uses: Timmatt-Lee/Github-Jira-Integration@master
      with:
        host: ${{ secrets.JIRA_BASE_URL }}
        email: ${{ secrets.JIRA_USER_EMAIL }}
        token: ${{ secrets.JIRA_API_TOKEN }}
        project: ${{ secrets.JIRA_PROJECT_NAME }}
        transition: ${{ secrets.JIRA_MERGE_TRANSITION_NAME }}
        isOnlyTransition: true
```

`body-template` can be set to a GitHub secret if necessary to avoid leaking sensitive data in the URLs for instance. `body-template: ${{ secrets.PR_BODY_PREFIX_TEMPLATE }}`

_**NOTE**: template values must contain the `%branch%` token (can occur multiple times) so that it can be replaced with the matched text from the branch name._

## Example

So the following yaml

```
name: "Update Pull Request"
on: pull_request

jobs:
  pr_update_text:
    runs-on: ubuntu-latest
    steps:
    - uses: tzkhan/pr-update-action@v1.1.1
      with:
        repo-token: "${{ secrets.GITHUB_TOKEN }}"
        branch-regex: 'foo-\d+'
        lowercase-branch: false
        title-template: '[%branch%]'
        replace-title: false
        title-prefix-space: true
        uppercase-title: true
        body-template: '[Link to %branch%](https://url/to/browse/ticket/%branch%)'
        replace-body: false
        body-prefix-newline-count: 2
        uppercase-body: true
```

produces this effect... :point_down:

#### before:
![pr before](img/pr-before.png)

#### after:
![pr after](img/pr-after.png)
