import { startNatsServerAndConnectBus, TestConnection } from "./support/test-utils";
import bus from "../index";
const conf = require("../conf");

describe("Fruster bus validation", function () {
	let natsConnection: TestConnection;

	beforeAll((done) => {
		startNatsServerAndConnectBus(undefined, "/spec/support/test-schemas")
			.then((connection) => {
				natsConnection = connection;
				done();
			})
			.catch(done.fail);
	});

	afterAll(() => {
		natsConnection.server.kill();
		bus.closeAll();
		conf.responseValidation = false;
	});

	afterEach(() => (conf.responseValidation = false));

	it("should validate request to schema", async () => {
		const car = {
			doors: 5,
			brand: "audi",
		};

		bus.subscribe({
			subject: "car-service.create",
			requestSchema: "car",
			responseSchema: "car",
			handle: (req) => req,
		});

		try {
			const resp = await bus.request({
				subject: "car-service.create",
				message: {
					reqId: "hello",
					data: car,
				},
			});

			expect(resp).toBeDefined();
		} catch (err) {
			console.error(err);
		}
	});

	it("should fail validation of request", async (done) => {
		const invalidCar = {
			doors: 8,
			brand: "audi",
		};

		bus.subscribe({
			subject: "car-service.create",
			requestSchema: "car",
			responseSchema: "car",
			handle: () => {
				done.fail("should not enter subscribe");
			},
		});

		try {
			await bus.request({
				subject: "car-service.create",
				message: {
					reqId: "hello",
					data: invalidCar,
				},
			});
			done.fail();
		} catch (err: any) {
			expect(err.status).toBe(400);
			done();
		}
	});

	it("should fail validation of response", async (done) => {
		bus.clearClients();
		await bus.closeAll();

		conf.responseValidation = true;

		try {
			natsConnection = await startNatsServerAndConnectBus(undefined, "/spec/support/test-schemas");
		} catch (err) {
			done.fail();
		}

		const invalidCar = {
			doors: 5,
			brand: "audi",
		};

		bus.subscribe({
			subject: "car-service.another-create",
			requestSchema: "car",
			responseSchema: "car",
			handle: () => {
				return {
					status: 200,
					data: {
						doors: 10, // <-- invalid
					},
				};
			},
		});

		try {
			await bus.request({
				subject: "car-service.another-create",
				message: {
					reqId: "hello",
					data: invalidCar,
				},
			});

			done.fail();
		} catch (err: any) {
			expect(err.status).toBe(500);
			expect(err.error.code).toBe("BAD_RESPONSE");

			done();
		}
	});

	it("should fail response validation of json schemas added as pojo", async (done) => {
		bus.clearClients();
		await bus.connect({
			address: "nats://mock",
			schemasDir: "/spec/support/test-schemas",
		});

		const CarSchema = require("./support/test-schemas/CarSchema");

		bus.subscribe({
			subject: "hello.world",
			requestSchema: CarSchema,
			responseSchema: CarSchema,
			handle: () => ({
				status: 200,
				data: {
					doors: 50,
					firstName: "audi",
				},
			}),
		});

		try {
			await bus.request({
				subject: "hello.world",
				message: {
					reqId: "hello",
					data: {
						brand: "audi",
						doors: 10,
					},
				},
			});

			done.fail();
		} catch (err: any) {
			expect(err.status).toBe(500, "err.status");
			expect(err.error.code).toBe("BAD_RESPONSE", "err.error.code");

			done();
		}
	});

	it("should fail request validation of json schemas added as pojo", async (done) => {
		bus.clearClients();
		await bus.connect({
			address: "nats://mock",
			schemasDir: "/spec/support/test-schemas",
		});

		const CarSchema = require("./support/test-schemas/CarSchema");

		bus.subscribe({
			subject: "hello.world",
			requestSchema: CarSchema,
			responseSchema: CarSchema,
			handle: () => ({
				status: 200,
				data: {
					doors: 50,
					firstName: "hello",
				},
			}),
		});

		try {
			await bus.request({
				subject: "hello.world",
				message: {
					reqId: "hello",
					data: {},
				},
			});

			done.fail();
		} catch (err: any) {
			expect(err.status).toBe(400, "err.status");
			expect(err.error.code).toBe("BAD_REQUEST", "err.error.code");

			done();
		}
	});
});
