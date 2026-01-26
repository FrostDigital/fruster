import bus from "@fruster/bus";
import testUtils from "../";

if (!process.env.CI) {
	describe("Fruster test utils", () => {
		it("should start and stop NATS server (random port)", (done) => {
			testUtils.startNatsServer().then((connection) => {
				expect(connection.server).toBeDefined();
				expect(connection.natsClient).toBeUndefined();

				testUtils.close(connection);

				done();
			});
		});

		it("should start and stop NATS server (given port)", (done) => {
			const port = 4321;

			testUtils.startNatsServer({ natsPort: port }).then((connection) => {
				expect(connection.port).toBe(port);

				testUtils.close(connection);

				done();
			});
		});

		it("should start, stop NATS server and connect fruster bus", (done) => {
			testUtils
				.start({
					bus: bus,
				})
				.then((connection) => {
					expect(connection.server).toBeDefined();
					expect(connection.natsClient).toBeDefined();
					expect(connection.bus).toBeDefined();

					testUtils.close(connection);

					done();
				});
		});

		it("should start, stop NATS server, connect fruster bus and start a service", async () => {
			const connection = await testUtils.start({
				bus: bus,
				service: {
					start: (busAddress) => {
						expect(busAddress).toMatch("nats://");
						return Promise.resolve();
					},
				},
			});

			expect(connection.server).toBeDefined();
			expect(connection.natsClient).toBeDefined();

			testUtils.close(connection);
		});

		describe("startBeforeEach", () => {
			/**
			 * This spec is a bit awkward, but it's the only way to test the
			 * `beforeStop` and `afterStart` hooks.
			 *
			 * Run the whole suite (this "describe") in order for it to work.
			 */
			let beforeStopInvoked = false;
			let afterStartInvoked = false;

			testUtils.startBeforeEach({
				bus: bus,
				service: {
					start: (busAddress) => {
						console.log("Starting fake service");
						expect(busAddress).toMatch("nats://");
						return Promise.resolve();
					},
				},
				afterStart: async (connection) => {
					afterStartInvoked = true;
					console.log("afterStart() completed");
				},
				beforeStop: async (connection) => {
					beforeStopInvoked = true;
					console.log("beforeStop() completed");
				},
			});

			it("should invoked startBeforeEach", async () => {
				console.log(
					"First run: afterStart should have been invoked but not beforeStop"
				);
				expect(afterStartInvoked).toBe(true);
				expect(beforeStopInvoked).toBe(false);
			});

			it("should invoked beforeStop", async () => {
				console.log(
					"Second run: beforeStop should have been invoked as the previous test has finished"
				);
				expect(beforeStopInvoked).toBe(true);
			});
		});
	});
}

async function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

// Detect if mongodb is available
let mongoDbAvailable = false;
try {
	require.resolve("mongodb");
	mongoDbAvailable = true;
} catch (e) {
	console.log("MongoDB not available, skipping MongoDB integration tests");
}

if (mongoDbAvailable && !process.env.CI) {
	describe("MongoDB integration", () => {
		it("should connect to MongoDB when mongoUrl is provided", async () => {
			const connection = await testUtils.start({
				bus: bus,
				mongoUrl: "mongodb://localhost:27017/fruster-test-util-test",
			});

			expect(connection.db).toBeDefined();
			expect(connection.client).toBeDefined();

			await testUtils.close(connection);
		});

		it("should pass mongoUrl to service.start()", async () => {
			let receivedMongoUrl: string | undefined;

			const connection = await testUtils.start({
				bus: bus,
				mongoUrl: "mongodb://localhost:27017/fruster-test-util-test",
				service: {
					start: (natsUrl: string, mongoUrl?: string) => {
						receivedMongoUrl = mongoUrl;
						expect(mongoUrl).toBe("mongodb://localhost:27017/fruster-test-util-test");
						return Promise.resolve();
					},
				},
			});

			expect(receivedMongoUrl).toBeDefined();

			await testUtils.close(connection);
		});

	});
}

// Detect if mongodb-memory-server is available
let mongoMemoryServerAvailable = false;
try {
	require.resolve("mongodb-memory-server");
	mongoMemoryServerAvailable = true;
} catch (e) {
	console.log("mongodb-memory-server not available, skipping in-memory MongoDB tests");
}

if (mongoMemoryServerAvailable && mongoDbAvailable && !process.env.CI) {
	describe("In-memory MongoDB integration", () => {
		it("should start in-memory MongoDB when useInMemoryMongo is true", async () => {
			const connection = await testUtils.start({
				bus: bus,
				useInMemoryMongo: true,
			});

			expect(connection.db).toBeDefined();
			expect(connection.client).toBeDefined();
			expect(connection.memoryServer).toBeDefined();

			await testUtils.close(connection);
		}, 30000); // Increased timeout for downloading MongoDB binary

		it("should pass in-memory MongoDB URI to service.start()", async () => {
			let receivedMongoUrl: string | undefined;

			const connection = await testUtils.start({
				bus: bus,
				useInMemoryMongo: true,
				service: {
					start: (natsUrl: string, mongoUrl?: string) => {
						receivedMongoUrl = mongoUrl;
						expect(mongoUrl).toMatch(/^mongodb:\/\//);
						return Promise.resolve();
					},
				},
			});

			expect(receivedMongoUrl).toBeDefined();
			expect(receivedMongoUrl).toMatch(/^mongodb:\/\//);

			await testUtils.close(connection);
		}, 30000);

		it("should allow database operations with in-memory MongoDB", async () => {
			const connection = await testUtils.start({
				bus: bus,
				useInMemoryMongo: true,
			});

			// Insert a document
			await connection.db?.collection("test").insertOne({ name: "test-user" });

			// Query the document
			const doc = await connection.db?.collection("test").findOne({ name: "test-user" });
			expect(doc).toBeDefined();
			expect(doc?.name).toBe("test-user");

			await testUtils.close(connection);
		}, 30000);


		it("should ignore mongoUrl when useInMemoryMongo is true", async () => {
			let receivedMongoUrl: string | undefined;

			const connection = await testUtils.start({
				bus: bus,
				mongoUrl: "mongodb://localhost:27017/should-be-ignored",
				useInMemoryMongo: true,
				service: {
					start: (natsUrl: string, mongoUrl?: string) => {
						receivedMongoUrl = mongoUrl;
						// Should receive in-memory URI, not the external mongoUrl
						expect(mongoUrl).not.toBe("mongodb://localhost:27017/should-be-ignored");
						expect(mongoUrl).toMatch(/^mongodb:\/\//);
						return Promise.resolve();
					},
				},
			});

			expect(receivedMongoUrl).toBeDefined();
			expect(receivedMongoUrl).not.toBe("mongodb://localhost:27017/should-be-ignored");

			await testUtils.close(connection);
		}, 30000);

		it("should work with custom in-memory MongoDB options", async () => {
			const connection = await testUtils.start({
				bus: bus,
				useInMemoryMongo: true,
				inMemoryMongoOptions: {
					instance: {
						dbName: "custom-test-db",
					},
				},
			});

			expect(connection.db).toBeDefined();
			expect(connection.memoryServer).toBeDefined();

			await testUtils.close(connection);
		}, 30000);
	});
}
