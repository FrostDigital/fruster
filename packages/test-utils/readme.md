# Fruster test utils

Utils for jasmine tests.

## Start and stop a service beforeEach/beforeAll

Convenient method to start nats, connect bus, optionally connect to MongoDB, and start a service before each or all tests.

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
			// do something after service has started
			return Promise.resolve();
		},
		beforeStop: (connection) => {
			// do something before connections are being stopped
			// such as closing a HTTP server for example
		}
	});

});
```

## MongoDB Support (Optional)

The test-utils package supports MongoDB connections, but does not include MongoDB as a dependency. If you need MongoDB support in your tests:

### Installation

If your application already uses MongoDB in production, the `mongodb` package is likely already installed as a regular dependency and no additional installation is needed.

If you only need MongoDB for testing (and your application doesn't use it in production), install it as a dev dependency:
```bash
pnpm add -D mongodb
```

If your application uses MongoDB in production:
```bash
pnpm add mongodb
```

### Usage

Use MongoDB in your tests by providing a `mongoUrl`:

```javascript
describe("Foo spec", () => {
	testUtils.startBeforeEach({
		service: service,
		bus: bus,
		mongoUrl: "mongodb://localhost:27017/test-db",
		dropDatabase: true,  // Drops database after each test
		afterStart: (connection) => {
			// Access MongoDB database
			const users = connection.db.collection("users");
			return users.insertOne({ name: "test" });
		},
	});

	it("should work with MongoDB", async () => {
		// Your test code here
	});
});
```

### Access MongoDB Connection

```javascript
const connection = await testUtils.start({
	bus: bus,
	mongoUrl: "mongodb://localhost:27017/test-db"
});

// connection.db is the MongoDB Db instance
// connection.client is the MongoClient instance
await connection.db.collection("users").insertOne({ name: "John" });

await testUtils.close(connection);
```

### Drop Database After Tests

Use the `dropDatabase` option to automatically clean up your test database:

```javascript
testUtils.startBeforeEach({
	service: service,
	bus: bus,
	mongoUrl: "mongodb://localhost:27017/test-db",
	dropDatabase: true  // Database will be dropped after each test
});
```

### Error Handling

If you use `mongoUrl` without installing the mongodb package, you'll receive a helpful error message:

```
MongoDB support requires the "mongodb" package to be installed.
Install it with: pnpm add mongodb (or pnpm add -D mongodb for test-only usage)
```

### Version Compatibility

This dynamic loading approach works with all MongoDB driver versions (3.x, 4.x, 5.x, 6.x) since the core API (`connect()`, `db()`, `close()`, `dropDatabase()`) has remained stable.

## In-Memory MongoDB Support (Optional)

For faster and more isolated tests, you can use in-memory MongoDB instead of connecting to an external MongoDB instance. This eliminates the need for a running MongoDB server during tests.

### Installation

Install both `mongodb` and `mongodb-memory-server` as dev dependencies:

```bash
pnpm add -D mongodb mongodb-memory-server
```

**Note:** The first time you use mongodb-memory-server, it will download a MongoDB binary (~70-100MB). This download is cached, so subsequent test runs will be fast.

### Basic Usage

Enable in-memory MongoDB with the `useInMemoryMongo` option:

```javascript
describe("Foo spec", () => {
	testUtils.startBeforeEach({
		service: service,
		bus: bus,
		useInMemoryMongo: true,  // Start in-memory MongoDB
		dropDatabase: true,       // Clean database after each test
		afterStart: (connection) => {
			// Access MongoDB database (just like with external MongoDB)
			const users = connection.db.collection("users");
			return users.insertOne({ name: "test" });
		},
	});

	it("should work with in-memory MongoDB", async () => {
		// Your test code here
	});
});
```

### Comparison: External vs In-Memory MongoDB

| Feature | External MongoDB (`mongoUrl`) | In-Memory MongoDB (`useInMemoryMongo`) |
|---------|------------------------------|---------------------------------------|
| **Setup** | Requires running MongoDB server | No external server needed |
| **Speed** | Network overhead | Faster (in-process) |
| **Isolation** | Shared server (potential conflicts) | Completely isolated per test run |
| **Cleanup** | Must manually clean data | Automatic cleanup on stop |
| **Best for** | Integration tests, debugging | Unit tests, CI/CD pipelines |

### Advanced Configuration

Customize the in-memory MongoDB server with `inMemoryMongoOptions`:

```javascript
testUtils.startBeforeEach({
	service: service,
	bus: bus,
	useInMemoryMongo: true,
	inMemoryMongoOptions: {
		binary: {
			version: "7.0.0",  // Specific MongoDB version
		},
		instance: {
			port: 27017,        // Custom port (optional)
			dbName: "test-db",  // Custom database name
			storageEngine: "ephemeralForTest",  // Fastest for testing
		},
	},
});
```

### Programmatic Usage

```javascript
const connection = await testUtils.start({
	bus: bus,
	useInMemoryMongo: true,
});

// connection.db is the MongoDB Db instance
// connection.client is the MongoClient instance
// connection.memoryServer is the MongoMemoryServer instance
await connection.db.collection("users").insertOne({ name: "John" });

await testUtils.close(connection);  // Automatically stops the memory server
```

### Behavior Notes

- When `useInMemoryMongo: true` is set, any `mongoUrl` option is **ignored**
- The in-memory server is automatically started before connecting to MongoDB
- The in-memory server is automatically stopped when calling `testUtils.close()` or `testUtils.stop()`
- Each test run gets a fresh, isolated MongoDB instance
- The `dropDatabase` option works with both external and in-memory MongoDB

### TypeScript Support

Full TypeScript types are provided for all in-memory MongoDB options:

```typescript
import testUtils, { FrusterTestUtilsOptions } from "@fruster/test-utils";

const options: FrusterTestUtilsOptions = {
	bus: bus,
	useInMemoryMongo: true,
	inMemoryMongoOptions: {
		binary: {
			version: "7.0.0",
		},
		instance: {
			dbName: "test-db",
			storageEngine: "ephemeralForTest",
		},
	},
};

const connection = await testUtils.start(options);
```

### Error Handling

If you use `useInMemoryMongo: true` without installing mongodb-memory-server, you'll receive a helpful error message:

```
In-memory MongoDB support requires the "mongodb-memory-server" package.
Install it with: pnpm add -D mongodb-memory-server
```

### Performance Tips

1. **Storage Engine**: Use `storageEngine: "ephemeralForTest"` (default) for fastest performance
2. **Binary Caching**: The MongoDB binary is downloaded once and cached. First run may be slow.
3. **CI/CD**: Pre-download the binary in your CI setup to avoid timeouts:
   ```bash
   # In CI setup script
   node -e "require('mongodb-memory-server').MongoMemoryServer.create()"
   ```

### Migration from External to In-Memory MongoDB

To migrate existing tests from external MongoDB to in-memory:

**Before:**
```javascript
testUtils.startBeforeEach({
	service: service,
	bus: bus,
	mongoUrl: "mongodb://localhost:27017/test-db",
	dropDatabase: true,
});
```

**After:**
```javascript
testUtils.startBeforeEach({
	service: service,
	bus: bus,
	useInMemoryMongo: true,  // Just change this!
	dropDatabase: true,       // Everything else stays the same
});
```

All your existing test code using `connection.db` and `connection.client` will work without changes.

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
