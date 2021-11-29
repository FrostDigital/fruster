const winston = require("winston");
const conf = require("./conf");
const FrusterLogger = require("./FrusterLogger");

module.exports = (function () {
	const logger = new FrusterLogger(conf.logLevel, conf.timestampTimezone, conf.remoteLogLevel);
	
	if (conf.syslog) {
		logger.enablePapertrailLogging(conf.syslog, conf.syslogName, conf.syslogProgram);
	}

	return logger;
}());

process.on("unhandledRejection", (reason) => {
	module.exports.error(reason);
});