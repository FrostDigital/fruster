# Fruster Bus Wrapper

Promisifies NATS Client and makes it aware of Fruster messages.

## Usage

Add to your project:

    npm install fruster-bus --save

Add this to your file:

    var bus = require('fruster-bus');

Connect to bus:

    # Pass in multiple if NATS cluster
    bus.connect(['nats://localhost:4222'])

Publish message:

    bus.publish({ subject: 'a.subject', foo: 'bar' });

Send request and handle response:

    bus.request('a.subject', {})
      .then(handleMessage)
      .catch(handleError);

Send request with 500 ms timeout:

    bus.request('a.subject', {}, 500)
      .then(handleMessage)
      .catch(handleError);

Subscribe:

    bus.subscribe('a.subject', function(req, replyTo) {
      // return response by publishing to replyTo
      bus.publish(replyTo, { /* your response msg */ });
    });

Subscibe and return response:

    bus.subscribe('a.subject', function(req) {
      // return of callback will be sent as response to `toReply`
      return { status: 200 };
    });

Subscribe and return response as promise:

    bus.subscribe('user.get', function(req) {
      // ok to return a promise that resolves response message
      return getUser(req.msg.data.userId).then(function(user) {
        return { status: 200 /*... */ };
      });
    });

All subscriptions will create a queue group by default with name of subject. Pass in boolean false as last argument to disable queue group:

    bus.subscribe("user.get", handle, false);

### Permissions for subscribe

Must be logged in to access. Anyone logged in can access, no matter permissions.

    bus.subscribe('a.subject', function(req) {
      // return of callback will be sent as response to `toReply`
      return { status: 200 };
    })
    .mustBeLoggedIn();

Must have specific permissions to access. When using permissions `.mustBeLoggedIn()` is not required since permissions only work on logged in users anyway.

    bus.subscribe('a.subject', function(req) {
      // return of callback will be sent as response to `toReply`
      return { status: 200 };
    })
    .permissions(["user.get", "user.create"]);

Open to public without any permissions.

    bus.subscribe('a.subject', function(req) {
      // return of callback will be sent as response to `toReply`
      return { status: 200 };
    });

#### Defining permissions

A permission is defined in the following way {{entity}}.{{action}}. E.g. **user.create**.
The action can be a wildcard, accepting any action within that entity.

### Defining params

Fruster bus features a specific fruster bus param definition for http requests.

    "http.post.user.:userId" - Translates to "http.post.user.*" in NATS.

Any param defined with a colon (:userId) will be accessible from the subscription handler via the object request.params

## Run in mocked mode

Nats client will run in mocked mode if connection string is `nats://mock`. All messages will be published and subscribing from memory
and not connecting to an actual bus. Needless to say, but this is only for development purposes, i.e. running tests wo the need to
spin up NATS server.

## Test

You need `gnatsd` to run tests. Read installation instructions [here](http://nats.io/documentation/tutorials/gnatsd-install/).

    npm test
