# Fruster test utils

Utils for jasmine tests.

## Start and stop a service beforeEach/beforeAll

Convenient method to start nats, connect bus, start mongo db and a service before each or all tests.

```javascript
describe("Foo spec", () => {

	// or use startBeforeAll
	testUtils.startBeforeEach({
		service: service,
		bus: bus
	});

});
```

If you need to do something after beforeAll/Each finished but before tests are started:

```javascript
describe("Foo spec", () => {

	// or use startBeforeAll
	testUtils.startBeforeEach({
		service: service,
		bus: bus,
		afterStart: (connection) => {
			repo = new Repo(connection.db);
			return Promise.resolve();
		},
		beforeStop: (connection) => {
			// do something before connections are being stopped
			// such as closing a HTTP server for example
		}
	});

});
```

## Mock a service


### Mock sequence of responses

To mock a service and return different response on each invocation:

```javascript
const mockHello = testUtils.mockService({
	// subject to listen on
	subject: "foo-service.hello",

	// array of responses, where first request will receive first response etc
	responses: [
		{
			data: {
				foo: "first response"
			}
		},
		{
			data: {
				foo: "second response"
			}
		}
	]
});

// Send requests
bus.request({
	subject: "foo-service.hello",
	req: {
		data: "first request"
	}
});
bus.request({
	subject: "foo-service.hello",
	req: {
		data: "second request"
	}
});

// Set expectations
expect(mockHello.invocations).toBe(2);
expect(mockHello.requests[0].data).tobe("first request");
expect(mockHello.requests[1].data).tobe("second request");
```

### Mock a response

Perform expectations in callback:

```javascript
const mockHelloWorld = testUtils.mockService({
	subject: "foo-service.hello-world",
	response: {
		data: "hello world"
	}
});

bus.request({
	subject: "foo-service.hello-world",
	req: {
		data: "hello?"
	}
});

expect(mockHelloWorld.requests[0].data).toBe("hello?")
```
