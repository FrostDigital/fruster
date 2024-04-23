const winston = require("winston");
const moment = require("moment-timezone");
const constants = require("./constants");

class FrusterLogger extends winston.Logger {
  constructor(logLevel = "info", timestampTimezone = "Europe/Stockholm") {
    super({
      exitOnError: false,
      level: logLevel,
      levels: constants.levels,
      colors: constants.levelColors,
    });
    this.logLevel = logLevel;
    this.timestampTimezone = timestampTimezone;
    this._configureConsoleLogging();
  }

  /**
   * Enable logging to Papertrail using remote syslog.
   *
   * @param {String} syslogHostAndPort
   * @param {String} syslogName
   * @param {String} syslogProgram
   */
  enablePapertrailLogging(syslogHostAndPort, syslogName, syslogProgram) {
    require("winston-papertrail").Papertrail;

    const syslogHostAndPortSplit = syslogHostAndPort.split(":");

    let winstonPapertrail = new winston.transports.Papertrail({
      host: syslogHostAndPortSplit[0],
      port: syslogHostAndPortSplit[1],
      hostname: syslogName,
      program: syslogProgram,
      level: this.logLevel,
    });

    winstonPapertrail.on("error", function (err) {
      console.error(
        `Failed connecting to papertrail ${syslogHostAndPort}`,
        err
      );
    });

    super.add(winstonPapertrail, null, true);
  }

  _configureConsoleLogging() {
    const consoleTransport = new winston.transports.Console({
      humanReadableUnhandledException: true,
      handleExceptions: true,
      json: false,
      colorize: "all",
      prettyPrint: true,
      timestamp: () => this._getTimestamp(),
    });

    super.add(consoleTransport, null, true);
  }

  /**
   * Function that returns timestamp used for console log.
   * Note that timestamp is not used for remote syslog.
   */
  _getTimestamp() {
    const timeZonedDate = moment(new Date()).tz(this.timestampTimezone);
    return `[${timeZonedDate.format("YYYY-MM-DD hh:mm:ss")}]`;
  }

  /**
   * Audit log.
   *
   * @param {String} userId
   * @param {String} msg
   * @param {any=} payload
   */
  audit(userId, msg, payload) {
    // Will be overridden in `_attachRemoteLogs()` but kept
    // here to make intellisense work.
  }
}

module.exports = FrusterLogger;
