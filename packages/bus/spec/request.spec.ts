import bus from "../index";
import { startNatsServerAndConnectBus, TestConnection } from "./support/test-utils";

describe("request", function () {
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
	});

	it("should add toString function to object errors", async () => {
		const errorObj = {
			status: 500,
			error: { code: "MADE_UP_ERROR", detail: "Something completely made up happened" },
		};

		bus.subscribe({ subject: "ram-jam" }, () => {
			throw errorObj;
		});

		try {
			await bus.request({
				subject: "ram-jam",
				message: {
					reqId: "hello",
				},
			});
		} catch (err: any) {
			expect(err.status).toBe(500);
			expect(err.error).toBeDefined();

			const errorString = err.toString();

			expect(errorString).toContain("status");
			expect(errorString).toContain("500");

			Object.keys(errorObj.error).forEach((key) =>
				expect(errorString).toContain(
					// @ts-ignore
					errorObj.error[key],
					// @ts-ignore
					`errorString should contain ${key}: ${errorObj.error[key]}`
				)
			);
		}
	});

	it("should not throw errors if throwErrors is set to false", async () => {
		const errorObj = {
			status: 500,
			error: { code: "MADE_UP_ERROR", detail: "Something completely made up happened" },
		};

		bus.subscribe({ subject: "qwerty" }, () => {
			throw errorObj;
		});

		const err = await bus.request({
			subject: "qwerty",
			message: {
				reqId: "hello",
			},
			throwErrors: false,
		});

		expect(err.status).toBe(500);
		expect(err.error).toBeDefined();
	});
});
