class ErrorExit {
  static ErrorType(status, message) {
    return {
      status,
      message,
    };
  }

  static get INIT() {
    return this.ErrorType(100, 'Jira init error');
  }

  static trigger(e) {
    process.exit(e.status);
  }
}

module.exports = ErrorExit;
