import * as uuid from "uuid";
import constants from "../constants";
import bus, { version } from "../index";
import { startNatsServerAndConnectBus, TestConnection } from "./support/test-utils";
import conf from "../conf";

conf.serviceName = "fake-service";

describe("Fruster bus", () => {
	let natsConnection: TestConnection;
	let subject: string;

	beforeEach(() => {
		subject = uuid.v4();
	});

	beforeAll(async () => {
		natsConnection = await startNatsServerAndConnectBus();
	});

	afterAll(() => {
		natsConnection.server.kill();
		bus.closeAll();
	});

	it("should have a version", () => {
		expect(version).toBeDefined();
	});

	describe("Publish and subscribe", () => {
		it("should publish and subscribe", (done) => {
			bus.subscribe<{ foo: string }>(subject, (req) => {
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

		it("should publish message with empty payload", (done) => {
			bus.subscribe(subject, (req) => {
				expect(req.from).toBeDefined();

				expect(req.query).toEqual({});
				expect(req.headers).toEqual({});
				expect(req.params).toEqual({});

				done();
			});

			bus.publish({ subject, message: {} });
		});

		it("should reject if request has error status code", async (done) => {
			bus.subscribe(subject, () => {
				return {
					status: 400,
				};
			});

			try {
				await bus.request({ subject, message: { reqId: "hello" } });
				done.fail();
			} catch (err: any) {
				done();
			}
		});

		it("should set error id automatically", async () => {
			const title = "no id error";
			const detail = "but will it be set automatically?!";

			bus.subscribe({
				subject,
				responseSchema: "this-is-required-since-soft-force",
				handle: (req) => {
					return {
						status: 400,
						error: {
							code: "CODE",
							title,
							detail,
						},
					};
				},
			});

			try {
				await bus.request({ subject, message: { reqId: "bam", data: "bam!" } });
			} catch (err: any) {
				expect(err.status).toBe(400, "err.status");
				expect(err.error.title).toBe(title, "err.error.title");
				expect(err.error.detail).toBe(detail, "err.error.detail");
				expect(err.error.id).toBeDefined("err.error.id");
			}
		});

		it("should set thrower for error", async (done) => {
			/** Two-step subscribe */
			bus.subscribe(subject, (req, replyTo) => bus.request({ subject: subject + "helloooo", message: req }));
			bus.subscribe(subject + "helloooo", (req) => {
				throw {
					status: 500,
					error: {
						code: "ERROR_CODE",
						title: "IS AN ERROR",
						detail: "WITH SOME DETAILS",
					},
				};
			});

			try {
				await bus.request({ subject, message: { reqId: "hello" } });
				done.fail();
			} catch (err: any) {
				expect(err.error.thrower).toBe("fake-service");

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
				done.fail();
			} catch (err: any) {
				done();
			}
		});

		it("should NOT reject if message has EMPTY error object", (done) => {
			bus.subscribe(subject, (req, replyTo) => {
				bus.publish({
					subject: replyTo,
					message: {
						error: {},
					},
				});
			});

			bus.request({ subject, message: { reqId: "hello" } })
				.then(done)
				.catch(done.fail);
		});

		it("should reject if error is thrown in returned promise", async (done) => {
			bus.subscribe(subject, (req, replyTo) => {
				return new Promise(() => {
					throw {
						error: {
							id: "abc123",
						},
					};
				});
			});

			try {
				await bus.request({ subject, message: { reqId: "hello" } });
				done.fail();
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
				done.fail();
			} catch (err: any) {
				expect(err.error.id).toBe("abc123");
				done();
			}
		});

		it("should reject if error is thrown in callback", (done) => {
			bus.subscribe(subject, (req, replyTo) => {
				throw {
					error: {
						id: "abc123",
					},
				};
			});

			bus.request({ subject, message: { reqId: "hello" } })
				.then(() => done.fail)
				.catch((err) => {
					expect(err.error.id).toBe("abc123");
					done();
				});
		});

		it("should reject if error is resolved from promise", (done) => {
			bus.subscribe(subject, () => {
				return Promise.resolve({
					error: {
						id: "abc123",
						code: "CODE",
						title: "TITLE",
					},
				});
			});

			bus.request({ subject, message: { reqId: "hello" } })
				.then(() => done.fail)
				.catch((err) => {
					expect(err.error.id).toBe("abc123");
					done();
				});
		});

		it("should timeout response", (done) => {
			bus.subscribe(subject, (req, replyTo) => {
				setTimeout(() => {
					bus.publish({ subject: replyTo, message: {} });
				}, 2);
			});

			bus.request({ subject, message: { reqId: "hello" }, timeout: 1 })
				.then(() => done.fail)
				.catch(done);
		});

		it("should NOT timeout response", (done) => {
			bus.subscribe(subject, (req, replyTo) => {
				setTimeout(() => {
					bus.publish({ subject: replyTo, message: {} });
				}, 1);
			});

			bus.request({ subject, message: { reqId: "hello" }, timeout: 100 })
				.then(done)
				.catch(done.fail);
		});

		it("should send and receive multiple requests", (done) => {
			bus.subscribe(subject, (req, replyTo) => {
				bus.publish({ subject: replyTo, message: {} });
			});

			let firstReq = bus
				.request({ subject, message: { reqId: "hello" } })
				.then(sendNext)
				.catch(done.fail);

			function sendNext() {
				bus.request({ subject, message: { reqId: "hello" } })
					.then(done)
					.catch(done.fail);
			}
		});

		it("should send response if returned from subscribe callback", (done) => {
			bus.subscribe(subject, (req) => {
				return {};
			});

			bus.request({ subject, message: { reqId: "hello" } })
				.then(done)
				.catch(done.fail);
		});

		it("should send response if returned as a promise from subscribe callback", (done) => {
			bus.subscribe(subject, (req) => {
				return new Promise((resolve, reject) => {
					expect(req.reqId).toBe("reqId");
					expect(req.transactionId).toBeDefined();
					resolve({
						status: 200,
					});
				});
			});

			bus.request({ subject, message: { reqId: "reqId" } })
				.then((msg) => {
					expect(msg.status).toBe(200);
					expect(msg.reqId).toBe("reqId");
					done();
				})
				.catch(done.fail);
		});

		it("should generate transaction id, request id and set from for request and pass it on in response", (done) => {
			let transactionId: string;
			let reqId: string;

			bus.subscribe("foo.babar", (req, replyTo) => {
				expect(req.transactionId).toBeDefined();
				expect(req.reqId).toBeDefined("reqId");
				expect(req.from.service).toBe("fake-service");
				expect(req.from.instanceId).toBeDefined();

				transactionId = req.transactionId;
				reqId = req.reqId;
				return {};
			});

			bus.request({
				subject: "foo.babar",
				message: {
					reqId: "reqId",
				},
			}).then((resp) => {
				expect(resp.transactionId).toBe(transactionId);
				expect(resp.reqId).toBe(reqId);
				expect(resp.from.service).toBe("fake-service");
				expect(resp.from.instanceId).toBeDefined();
				done();
			});
		});

		it("should send request and get multiple responses", (done) => {
			[1, 2, 3].forEach((i) => {
				bus.subscribe(
					{
						subject: "faking-a-subject",
						createQueueGroup: false,
						responseSchema: "",
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

			bus.requestMany({
				subject: "faking-a-subject",
				message: { reqId: "hello" },
				timeout: 200,
				maxResponses: 2,
			}).then((responses) => {
				expect(responses.length).toBe(2);
				done();
			});
		});

		it("should send request and expect to get multiple responses but timeout", (done) => {
			bus.requestMany({
				subject: "faking-another-subject",
				message: { reqId: "hello" },
				timeout: 200,
				maxResponses: 2,
			}).then((responses) => {
				expect(responses.length).toBe(0);
				done();
			});
		});

		it("should set how many milliseconds it took to respond to request", async (done) => {
			const subject = "ms.test";
			const fakeDelayMs = 100;

			bus.subscribe(subject, (req) => {
				return new Promise((resolve) => {
					// Fake 100 ms delay
					setTimeout(() => resolve({ status: 200 }), fakeDelayMs);
				});
			});

			const resp = await bus.request({ subject, message: { reqId: "reqId" } });

			expect(resp.ms).toBeGreaterThan(fakeDelayMs - 1);

			done();
		});
	});

	describe("Permissions", () => {
		it("should allow anything with no permissions defined", async (done) => {
			bus.subscribe(subject, (req) => {
				expect(req.user?.scopes).toEqual(["user.get"]);
				done();
			});

			try {
				await bus.publish({
					subject,
					message: {
						user: {
							id: "foo",
							scopes: ["user.get"],
						},
					},
				});
			} catch (err: any) {
				done.fail();
			}
		});

		it("should not allow users with incorrect permissions to make call", async (done) => {
			bus.subscribe({
				subject,
				responseSchema: "",
				permissions: ["user.get", "user.create", "banana.eat"],
				handle: () => {
					return {
						status: 200,
					};
				},
			});

			try {
				await bus.testBus.request({
					subject,
					message: {
						reqId: "hello",
						user: {
							id: "foo",
							scopes: ["user.get", "user.create"],
						},
						data: {
							reqId: "hello",
						},
					},
				});
				done.fail("Should have thrown 403 error");
			} catch (err: any) {
				expect(err.status).toBe(403);
				done();
			}
		});

		it("should allow users with any correct sub set of permissions to make call", async () => {
			bus.subscribe(
				{
					subject,
					responseSchema: "",
					permissions: [
						["user.drop.dead"],
						["user.cant.dead", "be", "wat"],
						["user.get", "user.create", "banana.eat"],
					],
				},
				(req) => {
					return {
						status: 200,
					};
				}
			);

			bus.subscribe({
				subject: subject + 2,
				responseSchema: "",
				handle: (req, replyTo) => {
					return {
						status: 200,
					};
				},
			}).permissions(["user.cant.dead"]);

			const resp = await bus.testBus.request({
				subject,
				message: {
					reqId: "hello",
					user: { id: "foo", scopes: ["user.cant.dead", "be", "wat"] },
				},
			});

			expect(resp.status).toBe(200);

			const secondResp = await bus.testBus.request({
				subject: subject + 2,
				message: {
					reqId: "hello",
					user: { id: "foo", scopes: ["user.cant.dead"] },
				},
			});

			expect(secondResp.status).toBe(200);
		});

		it("should allow users with wildcard permission to make call", async () => {
			bus.subscribe(subject, (req) => {
				return {
					status: 200,
				};
			}).permissions(["user.get", "user.create", "banana.eat"]);

			const resp = await bus.testBus.request({
				subject,
				message: {
					reqId: "hello",
					user: {
						id: "foo",
						scopes: ["*"],
					},
				},
			});

			expect(resp.status).toBe(200);
		});

		it("should allow users with any action permissions to make call for wildcard actions within entity", async () => {
			bus.subscribe(subject, (req, replyTo) => {
				return {
					status: 200,
				};
			}).permissions(["user.*"]);

			const resp = await bus.testBus.request({
				subject,
				message: {
					reqId: "hello",
					user: {
						id: "foo",
						scopes: ["user.get"],
					},
				},
			});

			expect(resp.status).toBe(200);
		});

		it("should not allow users not logged in to access when must be logged in is specified", async () => {
			bus.subscribe(subject, (req) => {
				return {
					status: 200,
				};
			}).mustBeLoggedIn();

			try {
				await bus.request({ subject, message: { reqId: "hello" } });
			} catch (err: any) {
				expect(err.status).toBe(403);
			}
		});

		it("should not allow users not logged in to access when must be logged in is specified", async () => {
			bus.subscribe(subject, (req) => {
				return {
					status: 200,
				};
			}).mustBeLoggedIn();

			try {
				await bus.request({ subject, message: { reqId: "hello" } });
			} catch (err: any) {
				expect(err.status).toBe(403);
			}
		});
	});

	describe("Subject parameters", () => {
		it("should accept fruster-specific param-url", async () => {
			bus.subscribe("http.post.user.:userId.school.:schoolId", (req) => {
				expect(req.params.userId).toBe("UserId");
				expect(req.params.schoolId).toBe("SchoolId");
				return {
					status: 200,
				};
			});

			const resp = await bus.request({
				subject: "http.post.user.UserId.school.SchoolId",
				message: {
					reqId: "hello",
				},
			});

			expect(resp.status).toBe(200);
		});

		it("should add params w/ values to req object", async (done) => {
			bus.subscribe("ws.post.org.:userId.school.:schoolId", (req) => {
				expect(req.params.userId).toBe("BobId");
				expect(req.params.schoolId).toBe("SkolanId");
				done();
			});

			try {
				await bus.request({
					subject: "ws.post.org.BobId.school.SkolanId",
					message: {
						reqId: "hello",
					},
				});
			} catch (err: any) {
				console.error(err);
				done.fail();
			}
		});

		it("should be possible to send params w/ request", async () => {
			bus.subscribe("ws.post.org", (req) => {
				expect(req.params.hello).toBe("1337");
				return {
					status: 200,
				};
			});

			const resp = await bus.testBus.request({
				subject: "ws.post.org",
				message: {
					params: {
						hello: "1337",
					},
					reqId: "hello",
				},
			});

			expect(resp.status).toBe(200);
		});
	});

	describe("Compression", () => {
		beforeAll(() => {
			conf.compressionStrategy = constants.COMPRESSION_STRATEGY_AUTO;
		});

		afterAll(() => {
			conf.compressionStrategy = constants.COMPRESSION_STRATEGY_MANUAL;
		});

		it("should decompress data in incoming request", async (done) => {
			const data = {
				foo: "bar",
			};

			bus.subscribe(subject, (req) => {
				expect(req.data).toEqual(data);
				done();
			});

			const req = {
				reqId: "reqId",
				dataEncoding: constants.CONTENT_ENCODING_GZIP,
				data,
			};

			await bus.request({ subject, message: req });
		});

		it("should decompress response to a request", async () => {
			const data = {
				foo: "bar",
			};

			bus.subscribe(subject, async (req) => {
				return {
					dataEncoding: constants.CONTENT_ENCODING_GZIP,
					data,
				};
			});

			const resp = await bus.request({ subject, message: { reqId: "reqId", data: {} } });

			expect(resp.data).toEqual(data);
		});

		it("should NOT compress data in subscribe if message is less than threshold", (done) => {
			const data = {
				foo: "bar",
			};

			bus.subscribe(subject, (req) => {
				expect(req.data).toEqual(data);
				expect(req.dataEncoding).toBeUndefined();
				done();
			});

			const req = {
				reqId: "reqId",
				data,
			};

			bus.request({ subject, message: req });
		});

		it("should fail to decompress in subscribe if using unrecognized dataEncoding", async (done) => {
			const data = {
				foo: "bar",
			};

			bus.subscribe(subject, (req) => {});

			const req = {
				reqId: "reqId",
				dataEncoding: "FAKE_DATA_ENCODING",
				data,
			};

			try {
				await bus.request({ subject, message: req });
			} catch (err: any) {
				expect(err.status).toBe(400);
				expect(err.reqId).toBe("reqId");
				expect(err.error.code).toMatch("INVALID_DATA_ENCODING");
				done();
			}
		});

		it("should fail to decompress in requests response if using unrecognized dataEncoding", async (done) => {
			bus.subscribe(subject, (req) => {
				return {
					status: 200,
					dataEncoding: "FAKE_DATA_ENCODING",
					data: {},
				};
			});

			const req = {
				reqId: "reqId",
				data: {},
			};

			try {
				await bus.request({ subject, message: req });
			} catch (err: any) {
				expect(err.status).toBe(400);
				expect(err.reqId).toBe("reqId");
				expect(err.error.code).toMatch("INVALID_DATA_ENCODING");
				done();
			}
		});

		it("should compress data in request if larger than threshold value and compression strategy is auto", async (done) => {
			const data = require("./support/1mb");

			bus.subscribe(subject, (req) => {
				expect(req.dataEncoding).toBe(constants.CONTENT_ENCODING_GZIP);
				expect(req.data.foo).toBeDefined();
				done();
			});

			await bus.request({ subject, message: { reqId: "reqId", data } });
		});

		it("should compress data in response if larger than threshold value and compression strategy is auto", async (done) => {
			bus.subscribe(subject, (req) => {
				return {
					status: 200,
					data: require("./support/1mb"),
				};
			});

			const resp = await bus.request({ subject, message: { reqId: "reqId", data: {} } });

			expect(resp.dataEncoding).toBe(constants.CONTENT_ENCODING_GZIP);
			expect(resp.data.foo).toBeDefined("data should have been decompressed");

			done();
		});
	});
});
