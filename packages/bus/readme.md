# Fruster Bus

A wrapper around NATS client to use with Fruster micro services.

Read more at https://fruster.io.

## Debug

Set env variable `DEBUG_FRUSTER_BUS` to enable debug logs:

```
export DEBUG_FRUSTER_BUS=1
```

## Run in mocked mode

Nats client will run in mocked mode if connection string is `nats://mock`. All messages will be published and subscribing from memory
and not connecting to an actual bus. Needless to say, but this is only for development purposes, i.e. running tests wo the need to
spin up NATS server.

## Test

You need `nats-server` locally to run tests. Read installation instructions [here](https://docs.nats.io/running-a-nats-service/introduction/installation).

    npm test
