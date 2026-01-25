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

		it("should drop database when dropDatabase option is true", async () => {
			const connection = await testUtils.start({
				bus: bus,
				mongoUrl: "mongodb://localhost:27017/fruster-test-util-drop-test",
			});

			// Insert a document to verify database exists
			await connection.db?.collection("test").insertOne({ test: "data" });

			await testUtils.close(connection, { dropDatabase: true });

			// Verify database was dropped by reconnecting
			const connection2 = await testUtils.start({
				bus: bus,
				mongoUrl: "mongodb://localhost:27017/fruster-test-util-drop-test",
			});

			const doc = await connection2.db?.collection("test").findOne({ test: "data" });
			expect(doc).toBeNull();

			await testUtils.close(connection2);
		});
	});
}
