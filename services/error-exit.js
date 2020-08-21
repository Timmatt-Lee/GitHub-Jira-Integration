class ErrorExit {
    static ErrorType(code, msg) {
        return {
            code,
            msg
        };
    }

    static get INIT() {
        return this.ErrorType(100, 'Jira init error');
    }

    constructor(e) {
        console.error(new Error(e.msg));
        process.exit(e.code);
    }
}

module.exports = ErrorExit;
