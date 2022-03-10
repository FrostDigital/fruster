# Fruster Health

Package that checks service health by periodically pinging the NATS bus.

## Flow of events

1. Health check is started in service (see **Usage** below).
2. Application will periodically send a message (a ping) over the bus that itself will subscribe to.
3. When ping is received (looped back) the service is considered to be healthy and will publish its health status to the configured `publishers`.
4. The outside monitioring system (Kubernetes liveness checks in our case) will continously ping one of above `publishers` to validate that service is running and take actions if its not healthy.

## Usage

Include in project:

    npm install fruster-health --save

Initialize and start health checks during app startup with:

    const health = require("fruster-health");
    
    // Will start a health health check and publish health by writing a healt probe file
    // `.health` to the services current working directory.
    health.start();

Configure your deis app with the following to enable kubernetes liveness checks:

    deis healthchecks:set -a {deis app name} liveness exec -- cat /bin/cat .health


### Expose health over HTTP

HTTP publisher is used to publish the services health information over `GET /healthz`.

This can be enabled by setting environmental variable `EXPOSE_HEALTH_HTTP` to `true`.

Path and HTTP port can be configured by setting `HEALTH_PORT` and `HEALTH_PATH`.

Configure your deis app with the following to enable kubernetes liveness checks:

    deis healthchecks:set -a {deis app name} liveness httpGet {health port} --path /healthz


### Manually fail health

If hosting application has specific conditions that may fail the health check the `fail(reason)` can be used:

    require("fruster-health").start();
     
    // ...
    
    if (someConditionIsTrue) {
        require("fruster-health").fail();
    }


## Under the hood

Fruster health will, after an optional grace period, start a periodical check where service will publish a message over the bus to subject `health.{app name}.{random id}` and see if it can subscribe and get the message back. 

If service is able to read the message back it is considered to be healthy and a file named `.health` is created in the current working directory. Kubernetes health checks will periodically check if this file exists and if it does, pass the health check.

If service fails to get the message back more than `ALLOWED_FAILED_ATTEMPTS` (see config below) times, it report failure by removing `.health` file. Kubernetes will notice when its removed and eventually report back to the scheduler and ask it to restart the service. 

## Configuration

Configuration is picked up from environmental variables.

    # NATS servers, set multiple if using cluster
    # Example: `['nats://10.23.45.1:4222', 'nats://10.23.41.8:4222']`
    BUS="nats://localhost:4222"

    # Interval that health checks will be performed
    HEALTH_CHECK_INTERVAL = "30s"

    # Time period to wait until service has started and health check should be started
    HEALTH_CHECK_GRACE_PERIOD = "2s"

    # Consecutive failed attempts that is allowed
    ALLOWED_FAILED_ATTEMPTS = 0

    # Name of app/service, if not set it will use `DEIS_APP`
    APP_NAME = "na"
    
    # If health HTTP endpoint will be created and exposed on 
    # configure path and port
    EXPOSE_HEALTH_HTTP = "false"

    # Port health http server will listen to
    HEALTH_PORT = 3200

    # Path to where health is exposes over HTTP
    HEALTH_PATH = "/healthz"
