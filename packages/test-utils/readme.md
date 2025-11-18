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

**Note:** When using `responses` array, the mock will automatically unsubscribe after all responses have been sent. This allows you to easily chain mocks for the same subject in complex test flows.

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

## Subscription Management

### Manual unsubscribe

You can manually unsubscribe a mock when you need to replace it with a different mock for the same subject:

```javascript
// Create first mock
const mock1 = testUtils.mockService({
	subject: "user-service.get-user",
	response: { data: { id: 1, name: "John" } }
});

// Do some tests...
await doSomething();

// Replace with new mock that returns different data
mock1.unsubscribe();

const mock2 = testUtils.mockService({
	subject: "user-service.get-user",
	response: { data: { id: 2, name: "Jane" } }
});

// Continue testing with new mock...
```

### Auto-unsubscribe

For one-shot mocks in complex flows, use the `autoUnsubscribe` option:

```javascript
const mock = testUtils.mockService({
	subject: "payment-service.process",
	response: { data: { success: true } },
	autoUnsubscribe: true  // Will unsubscribe after first response
});

// Make one request
await processPayment();

// Mock is now automatically unsubscribed
// You can create a new mock for the same subject
const mock2 = testUtils.mockService({
	subject: "payment-service.process",
	response: { data: { success: false, error: "Insufficient funds" } }
});
```

### Chaining mocks with late-bound data

Using callbacks and unsubscribe, you can chain mocks with data that's only available at test time:

```javascript
// First phase of test
const mock1 = testUtils.mockService({
	subject: "order-service.create",
	response: { data: { orderId: "order-1" } }
});

const result = await createOrder();
const orderId = result.orderId;

// Replace mock with one that uses the orderId
mock1.unsubscribe();

const mock2 = testUtils.mockService({
	subject: "order-service.get",
	response: (req) => ({
		data: {
			id: orderId,  // Use the captured orderId
			status: "completed"
		}
	})
});

await verifyOrder(orderId);
```

## Dynamic Response Updates

### Update single response

Change the mock response without recreating the mock:

```javascript
const mock = testUtils.mockService({
	subject: "config-service.get",
	response: { data: { feature: "disabled" } }
});

// Run tests with feature disabled
await testFeatureDisabled();

// Update response for next phase
mock.setResponse({ data: { feature: "enabled" } });

// Run tests with feature enabled
await testFeatureEnabled();
```

### Update with callback function

Use a callback for dynamic responses:

```javascript
let counter = 0;
const mock = testUtils.mockService({
	subject: "id-service.next",
	response: { data: { id: 0 } }
});

// Update to return incrementing IDs
mock.setResponse(() => {
	counter++;
	return { data: { id: counter } };
});

// Each request gets a different ID
const resp1 = await getNextId(); // id: 1
const resp2 = await getNextId(); // id: 2
```

### Update responses array

Update the entire responses array and reset counters:

```javascript
const mock = testUtils.mockService({
	subject: "api-service.call",
	responses: [
		{ data: "response 1" },
		{ data: "response 2" }
	]
});

// Use first two responses
await makeApiCall(); // Gets "response 1"
await makeApiCall(); // Gets "response 2"

// Update with new responses (resets counter)
mock.setResponses([
	{ data: "new response 1" },
	{ data: "new response 2" },
	{ data: "new response 3" }
]);

// Counter is reset, starts from beginning
await makeApiCall(); // Gets "new response 1"
```
