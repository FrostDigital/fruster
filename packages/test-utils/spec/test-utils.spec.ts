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

		it("should start, stop NATS server, connect fruster bus, connect to mongodb and start a service", async () => {
			const connection = await testUtils.start({
				bus: bus,
				mongoUrl: "mongodb://localhost:27017/fruster-test-util-test",
				service: {
					start: (busAddress, mongoUrl) => {
						expect(busAddress).toMatch("nats://");
						expect(mongoUrl).toBe(
							"mongodb://localhost:27017/fruster-test-util-test"
						);
						return Promise.resolve();
					},
				},
			});

			expect(connection.server).toBeDefined();
			expect(connection.natsClient).toBeDefined();
			expect(connection.db).toBeDefined();

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
				mongoUrl: "mongodb://localhost:27017/fruster-test-util-test",
				service: {
					start: (busAddress, mongoUrl) => {
						console.log("Starting fake service");
						expect(busAddress).toMatch("nats://");
						expect(mongoUrl).toBe(
							"mongodb://localhost:27017/fruster-test-util-test"
						);
						return Promise.resolve();
					},
				},
				afterStart: async (connection) => {
					afterStartInvoked = true;

					const doc = await connection.db
						.collection("test")
						.findOne({ test: "test" });

					expect(doc).toBeNull();

					await connection.db
						.collection("test")
						.insertOne({ test: "test" });

					console.log("afterStart() completed");
				},
				beforeStop: async (connection) => {
					beforeStopInvoked = true;
					const doc = await connection.db
						.collection("test")
						.findOne({ test: "test" });
					expect(doc).toBeDefined();

					console.log("beforeStop() completed");
				},
				dropDatabase: true,
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
