import testUtils from "../";
import bus from "@fruster/bus";

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

		it("should start, stop NATS server, connect fruster bus, connect to mongodb and start a service", (done) => {
			testUtils
				.start({
					bus: bus,
					mongoUrl:
						"mongodb://localhost:27017/fruster-test-util-test",
					service: {
						start: (busAddress, mongoUrl) => {
							expect(busAddress).toMatch("nats://");
							expect(mongoUrl).toBe(
								"mongodb://localhost:27017/fruster-test-util-test"
							);
							return Promise.resolve();
						},
					},
				})
				.then((connection) => {
					expect(connection.server).toBeDefined();
					expect(connection.natsClient).toBeDefined();
					expect(connection.db).toBeDefined();

					testUtils.close(connection);

					done();
				});
		});
	});
}
