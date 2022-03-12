import { startNatsServerAndConnectBus, TestConnection } from "./support/test-utils";
import bus from "../index";
import { reqId, user } from "../lib/async-context";
import { MinimalUser } from "../lib/model/FrusterRequest";

describe("subscribe", function () {
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

	it("should throw MUST_BE_LOGGED_IN error if user is not authorized before checking PERMISSION DENIED", async (done) => {
		bus.subscribe({ subject: "ram-jam", permissions: ["test.hello"] }, () => {
			done.fail("Should not send request to ram-jam");
		});

		try {
			await bus.request({
				subject: "ram-jam",
				message: {
					reqId: "hello",
				},
			});
		} catch (err: any) {
			expect(err.status).toBe(403);
			expect(err.error.code).toBe("MUST_BE_LOGGED_IN");
			done();
		}
	});

	it("should throw MUST_BE_LOGGED_IN error if user is not authorized before checking PERMISSION DENIED", async (done) => {
		bus.subscribe({ subject: "ram-jam", mustBeLoggedIn: true }, () => {
			done.fail("Should not send request to ram-jam");
		});

		try {
			await bus.request({
				subject: "ram-jam",
				message: {
					reqId: "hello",
				},
			});
		} catch (err: any) {
			expect(err.status).toBe(403);
			expect(err.error.code).toBe("MUST_BE_LOGGED_IN");
			done();
		}
	});

	it("should throw MUST_BE_LOGGED_IN error if user is not authorized before checking PERMISSION DENIED", async (done) => {
		bus.subscribe({ subject: "ram-jam", mustBeLoggedIn: true, permissions: ["test.hello"] }, () => {
			done.fail("Should not send request to ram-jam");
		});

		try {
			await bus.request({
				subject: "ram-jam",
				message: {
					reqId: "hello",
				},
			});
		} catch (err: any) {
			expect(err.status).toBe(403);
			expect(err.error.code).toBe("MUST_BE_LOGGED_IN");
			done();
		}
	});

	it("should throw PERMISSION_DENIED error if user lacks right permission scopes", async (done) => {
		bus.subscribe({ subject: "ram-jam", permissions: ["test.hello"] }, () => {
			done.fail("Should not send request to ram-jam");
		});

		try {
			await bus.testBus.request({
				subject: "ram-jam",
				message: {
					reqId: "hello",
					user: {
						id: "some-id",
						scopes: ["test.wrong-permission"],
					},
				},
			});
		} catch (err: any) {
			expect(err.status).toBe(403);
			expect(err.error.code).toBe("PERMISSION_DENIED");
			done();
		}
	});

	it("should throw PERMISSION_DENIED error if user lacks right permission scopes if mustBeLoggedIn is set", async (done) => {
		bus.subscribe({ subject: "ram-jam", mustBeLoggedIn: true, permissions: ["test.hello"] }, () => {
			done.fail("Should not send request to ram-jam");
		});

		try {
			await bus.testBus.request({
				subject: "ram-jam",
				message: {
					reqId: "hello",
					user: {
						id: "some-id",
						scopes: ["test.wrong-permission"],
					},
				},
			});
		} catch (err: any) {
			expect(err.status).toBe(403);
			expect(err.error.code).toBe("PERMISSION_DENIED");
			done();
		}
	});

	it("should translate uncaught exception to internal server error when string is thrown", async (done) => {
		bus.subscribe({ subject: "throw-up" }, () => {
			throw "This is uncaught";
		});

		try {
			await bus.request({
				subject: "throw-up",
				message: {
					reqId: "reqId",
					data: {},
				},
			});
		} catch (err: any) {
			expect(err.status).toBe(500);
			expect(err.reqId).toBe("reqId");
			expect(err.error.detail).toBe("This is uncaught");
			done();
		}
	});

	it("should translate uncaught exception to internal server error when Error is thrown", async (done) => {
		bus.subscribe({ subject: "throw-up-again" }, async () => {
			throw new Error("This is uncaught");
		});

		try {
			await bus.request({
				subject: "throw-up-again",
				message: {
					reqId: "reqId",
					data: {},
				},
			});
		} catch (err: any) {
			expect(err.status).toBe(500);
			expect(err.reqId).toBe("reqId");
			expect(err.error.detail).toMatch("This is uncaught");
			done();
		}
	});

	it("should subscribe on legacy options request to keep backward compatibility", async () => {
		bus.subscribe({ subject: "has-options" }, async () => {
			return {
				status: 200,
			};
		});

		const optionsResponse = await bus.request({
			subject: "options.has-options",
			message: {
				reqId: "reqId",
				data: {},
			},
		});

		expect(optionsResponse.data.protocol).toBe("NATS");
		expect(optionsResponse.reqId).toBe("reqId");
		expect(optionsResponse.transactionId).toBeDefined();
		expect(optionsResponse.from).toBeDefined();
	});

	it("should set and get context values for reqId and user", async (done) => {
		const subject1 = "context-test-1";
		const subject2 = "context-test-2";

		let count = 0;

		bus.subscribe({ subject: subject1 }, async (req) => {
			expect(reqId()).toBe(req.reqId);
			expect(user()).toBeDefined();

			await bus.request({
				subject: subject2,
				message: { data: { expectedReqId: reqId(), expectedUserId: user().id }, user: user() },
			});

			count++;

			if (count === 2) {
				done();
			}

			return {
				status: 200,
			};
		});

		bus.subscribe({ subject: subject2 }, (req) => {
			expect(reqId()).toBeDefined();
			expect(user()).toBeDefined();
			expect(reqId()).toBe(req.reqId, "reqId in context should equal reqId in request");
			expect(reqId()).toBe(req.data.expectedReqId, "reqId in context should equal expectedReqId");
			expect(req.data.expectedUserId).toBe(user().id);

			return {
				status: 200,
			};
		});

		bus.request({ subject: subject1, message: { reqId: "1", user: { id: "1" } as MinimalUser } });
		bus.request({ subject: subject1, message: { reqId: "2", user: { id: "2" } as MinimalUser } });
	});
});
