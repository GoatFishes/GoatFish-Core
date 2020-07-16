class ExceptionHandler extends Error {
    constructor(response_code, error) {
  
        super();
  
        Error.captureStackTrace(this, this.constructor);
  
        this.name = this.constructor.name;
  
        this.error = error;
  
        this.response_code = response_code;
  
        //logEvent(LOG_LEVELS.error, response_code, error)
  
        throw(this)
    }
  }
  module.exports = ExceptionHandler