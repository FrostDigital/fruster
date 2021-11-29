module.exports = {

    levels: {
        // Some really bad happened
        error: 0,

        // Something went wrong, but does not fail completely
        warn: 1,

        // Log to remote i.e. fruster-log-service if up an running
        remote: 2,

        // Audit log, will log to remote i.e. fruster-log-service if up and running
        audit: 3,

        // Info, not too verbose
        info: 4,

        // Debugging
        debug: 5,

        // Log everything!                
        silly: 7
    },

    levelColors: {
        error: "red",
        warn: "yellow",
        remote: "magenta",
        audit: "green",
        info: "cyan",
        debug: "reset",
        silly: "gray"
    }

};