module.exports = {
  // Applications log level (error|warn|info|debug|silly)
  logLevel: parseLogLevel(process.env.LOG_LEVEL) || 'debug',

  // Syslog host and port, if any
  // Example: `localhost:5499`
  syslog: process.env.SYSLOG || null,

  // Name of syslog
  syslogName: process.env.SYSLOG_NAME || 'fruster noname',

  // Syslog program name
  syslogProgram: process.env.SYSLOG_PROGRAM || process.env.DEIS_APP || 'default',

  timestamps: process.env.LOG_TIMESTAMPS !== "false",

  // See https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
  timestampTimezone: process.env.LOG_TIMESTAMP_TIMEZONE || "Europe/Stockholm",
  
  // Treshold level that will post logs on the bus 
  remoteLogLevel: (process.env.REMOTE_LOG_LEVEL || "error").toLowerCase()
};

function parseLogLevel(str) {
  if (str) {
    str = str.toLowerCase();
  }
  // align log level naming so `trace` becomes `silly
  return str == "trace" ? "silly" : str;
}
