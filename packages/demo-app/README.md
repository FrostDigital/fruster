# `demo-app`

Fruster demo app. Used for demo and testing purposes.

## Usage

Make sure nats message bus is running, for example by starting it as a docker container:

```
docker run --name nats --network nats --rm -p 4222:4222
```

Start the app:

```
npm run dev
```

Or use `npm run start` if you do not want auto restarting.
