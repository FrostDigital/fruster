const winston = require("winston");
const uuid = require("uuid");
const moment = require("moment-timezone");
const constants = require("./constants");

const LOG_LEVEL_REMOTE_NAME = "remote";
const LOG_LEVEL_AUDIT_NAME = "audit";

let bus;

class FrusterLogger extends winston.Logger {

    constructor(logLevel = "info", timestampTimezone = "Europe/Stockholm", remoteLogLevel = "error") {
        super({
            exitOnError: false,
            level: logLevel,
            levels: constants.levels,
            colors: constants.levelColors
        });
        this.logLevel = logLevel;
        this.timestampTimezone = timestampTimezone;
        this.remoteLogLevel = remoteLogLevel;
        this._configureConsoleLogging();
        this._attachRemoteLogs();
    }

    /**
     * Attach and intercepts log levels that will be posted on bus, i.e.
     * to fruster-log-service.
     * 
     * Note that log.audit() and log.remote() will always post to remote 
     * no matter of config.
     */
    _attachRemoteLogs() {
        const tresholdLevel = constants.levels[this.remoteLogLevel];
        let levelsToAttach = [];

        if (tresholdLevel !== undefined /* it can be 0, hence undefined check */) {
            // get all log levels from and "above" remote log level
            levelsToAttach = Object.keys(constants.levels)
                .filter(levelName => constants.levels[levelName] <= tresholdLevel);
        }

        // remote and audit log always log to remote no matter of config
        if (!levelsToAttach.includes(LOG_LEVEL_REMOTE_NAME)) {
            levelsToAttach.push(LOG_LEVEL_REMOTE_NAME);
        }

        if (!levelsToAttach.includes(LOG_LEVEL_AUDIT_NAME)) {
            levelsToAttach.push(LOG_LEVEL_AUDIT_NAME);
        }

        levelsToAttach.forEach((level) => {
            const superLog = this[level];

            if (level === LOG_LEVEL_AUDIT_NAME) {
                this[level] = (userId, msg, payload) => {
                    superLog(`[${userId}] ${msg}`);

                    this._publishOnBus(FrusterLogger.AUDIT_LOG_SUBJECT, {
                        userId, msg, payload, level
                    });
                };
            } else {
                this[level] = (...msg) => {
                    superLog(...msg);

                    this._publishOnBus(FrusterLogger.REMOTE_LOG_SUBJECT, {
                        level, msg
                    });
                };
            }
        });
    }

    _publishOnBus(subject, data) {
        if (!bus) {
            // Lazy require fruster-bus to avoid hassle with circular dependencies
            try {
                bus = require("fruster-bus");
            } catch (err) { }
        }

        // fruster-bus should expose better flag or function to check if connect
        // but this will do for now
        const isConnected = bus && !!bus.request;

        if (isConnected) {
            try {
                bus.publish(subject, {
                    reqId: uuid.v4(),
                    data
                });
            } catch (err) {
                // Nothing to do, bus is not connected.
            }
        }
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
            level: this.logLevel
        });

        winstonPapertrail.on("error", function (err) {
            console.error(`Failed connecting to papertrail ${syslogHostAndPort}`, err);
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
            timestamp: () => this._getTimestamp()
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

    /**
     * Remote log.     
     * 
     * @param {Array=} args 
     */
    remote(...args) {
        // Will be overridden in `_attachRemoteLogs()` but kept 
        // here to make intellisense work.
    }
}

FrusterLogger.AUDIT_LOG_SUBJECT = "log";
FrusterLogger.REMOTE_LOG_SUBJECT = "log";

module.exports = FrusterLogger;