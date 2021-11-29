import uuid from "uuid";
import bus from "../index";
const conf = require("../conf");

conf.serviceName = "fake-service";

describe("Fruster bus in mocked mode", () => {
	let subject: string;

	beforeEach(() => {
		subject = uuid.v4();
	});

	beforeAll(async () => {
		await bus.connect("nats://mock");
	});

	afterAll(() => {
		bus.closeAll();
	});

	describe("Publish and subscribe", () => {
		it("should publish and subscribe", (done) => {
			bus.testBus.subscribe(subject, (req) => {
				expect(req.data.foo).toBe("bar");
				expect(req.reqId).toBe("reqId");
				done();
			});

			bus.publish({
				subject,
				message: {
					data: { foo: "bar" },
					reqId: "reqId",
				},
			});
		});

		it("should reject if request has error status code", async (done) => {
			bus.subscribe(subject, (req, replyTo) => {
				bus.publish({
					subject: replyTo,
					message: {
						status: 400,
					},
				});
			});

			try {
				await bus.request({ subject, message: { reqId: "hello" } });
				done.fail("Fail if we got this far");
			} catch (err: any) {
				done();
			}
		});

		it("should set custom reply-to subject for request", (done) => {
			bus.subscribe(subject, (req, replyTo) => {
				expect(replyTo).toBe(`res.${req.transactionId}.${subject}`);
				done();
			});

			bus.request({ subject, message: { reqId: "hello" } });
		});

		it("should reject if message has non empty error object", async (done) => {
			bus.subscribe(subject, (req, replyTo) => {
				bus.publish({
					subject: replyTo,
					message: {
						error: {
							id: "abc123",
						},
					},
				});
			});

			try {
				await bus.request({ subject, message: { reqId: "hello" } });
				done.fail("Fail if we got this far");
			} catch (err: any) {
				done();
			}
		});

		it("should NOT reject if message has EMPTY error object", async () => {
			bus.subscribe(subject, (req, replyTo) => {
				bus.publish({
					subject: replyTo,
					message: {
						error: {},
					},
				});
			});

			await bus.request({ subject, message: { reqId: "hello" } });
		});

		it("should reject if error is thrown in returned promise", async (done) => {
			bus.subscribe(subject, (req, replyTo) => {
				return new Promise(function () {
					throw {
						error: {
							id: "abc123",
						},
					};
				});
			});

			try {
				await bus.request({ subject, message: { reqId: "hello" } });
				done.fail("Fail if we got this far");
			} catch (err: any) {
				expect(err.error.id).toBe("abc123");
				done();
			}
		});

		it("should reject if rejection in returned promise", async (done) => {
			bus.subscribe(subject, (req, replyTo) => {
				return Promise.reject({
					error: {
						id: "abc123",
					},
				});
			});

			try {
				await bus.request({ subject, message: { reqId: "hello" } });
				done.fail("Fail if we got this far");
			} catch (err: any) {
				expect(err.error.id).toBe("abc123");
				done();
			}
		});

		it("should reject if error is thrown in callback", async (done) => {
			bus.subscribe(subject, (req, replyTo) => {
				throw {
					error: {
						id: "abc123",
					},
				};
			});

			try {
				await bus.request({ subject, message: { reqId: "hello" } });
				done.fail("Fail if we got this far");
			} catch (err: any) {
				expect(err.error.id).toBe("abc123");
				done();
			}
		});

		it("should reject if error is resolved from promise", async (done) => {
			bus.subscribe(subject, (req, replyTo) => {
				return Promise.resolve({
					error: {
						id: "abc123",
					},
				});
			});

			try {
				await bus.request({ subject, message: { reqId: "hello" } });
				done.fail("Fail if we got this far");
			} catch (err: any) {
				expect(err.error.id).toBe("abc123");
				done();
			}
		});

		it("should timeout response", async (done) => {
			bus.subscribe(subject, (req, replyTo) => {
				setTimeout(function () {
					bus.publish({ subject: replyTo, message: {} });
				}, 2);
			});

			try {
				await bus.request({ subject, message: { reqId: "hello" }, timeout: 1 });
				done.fail("Fail if we got this far");
			} catch (err: any) {
				done();
			}
		});

		it("should not timeout response if response sent within max time", async () => {
			bus.subscribe(subject, (req, replyTo) => {
				setTimeout(function () {
					bus.publish({
						subject: replyTo,
						message: {
							reqId: req.reqId,
						},
					});
				}, 1);
			});

			await bus.request({ subject, message: { reqId: "hello" }, timeout: 100 });
		});

		it("should send response if returned from subscribe callback", async () => {
			bus.subscribe(subject, (req) => {
				return {
					reqId: req.reqId,
				};
			});

			await bus.request({ subject, message: { reqId: "hello" } });
		});

		it("should send response if returned as a promise from subscribe callback", async () => {
			bus.subscribe(subject, (req) => {
				return new Promise((resolve) => {
					expect(req.reqId).toBe("reqId");
					expect(req.transactionId).toBeDefined();
					resolve({
						status: 200,
						reqId: req.reqId,
					});
				});
			});

			const resp = await bus.request({ subject, message: { reqId: "reqId" } });

			expect(resp.status).toBe(200);
			expect(resp.reqId).toBe("reqId");
		});

		it("should generate transaction id, request id and set from for request and pass it on in response", async () => {
			let transactionId = "";
			let reqId = "";

			bus.subscribe("foo.babar", (req, replyTo) => {
				expect(req.transactionId).toBeDefined();
				expect(req.reqId).toBeDefined("reqId");
				expect(req.from.service).toBe("fake-service");
				expect(req.from.instanceId).toBeDefined();

				transactionId = req.transactionId;
				reqId = req.reqId;
				return {};
			});

			const resp = await bus.request({ subject: "foo.babar", message: { reqId: "reqId" } });

			expect(resp.transactionId).toBe(transactionId);
			expect(resp.reqId).toBe(reqId);
			expect(resp.from.service).toBe("fake-service");
			expect(resp.from.instanceId).toBeDefined();
		});

		it("should send request and get multiple responses", async () => {
			[1, 2, 3].forEach((i) => {
				bus.subscribe(
					{
						responseSchema: "",
						subject: "faking-a-subject",
						createQueueGroup: false,
					},
					(req) => {
						expect(req.from.service).toBe("fake-service");

						return {
							status: 200,
							data: i,
						};
					}
				);
			});

			const responses = await bus.requestMany({
				subject: "faking-a-subject",
				message: { reqId: "hello" },
				timeout: 200,
				maxResponses: 2,
			});

			expect(responses.length).toBe(2);
		});

		it("should send request and expect to get multiple responses but timeout", async () => {
			const responses = await bus.requestMany({
				subject: "faking-another-subject",
				message: { reqId: "hello" },
				timeout: 200,
				maxResponses: 2,
			});

			expect(responses.length).toBe(0);
		});
	});
});
