# Fruster log

A ready configured Winston logger that reads log level from environment.

The logger can also be configured to log to a Papetrail (and possibly other) remote syslog destination.

## Usage

To install:

    npm install fruster-log --save

To use in app:

    const log = require('fruster-log');

    log.debug('Hello', 'world');

## Configuration

    # Applications log level (error|warn|info|debug|silly)
    LOG_LEVEL = "debug"

    # Syslog host and port, if any
    # Example: `localhost:5499`
    SYSLOG = null
    
    # Name of syslog
    SYSLOG_NAME = "fruster noname"
    
    # Syslog program name
    SYSLOG_PROGRAM = "default"

    # Log level that will log remotely
    REMOTE_LOG_LEVEL = "error"
    