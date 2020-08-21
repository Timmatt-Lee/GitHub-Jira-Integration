class ErrorExit {
  static ErrorType(code, msg) {
    return {
      code,
      message,
    };
  }

  static get INIT() {
    return this.ErrorType(100, 'Jira init error');
  }

  static trigger(e) {
    console.error(e);
    process.exit(e.code);
  }
}

module.exports = ErrorExit;
