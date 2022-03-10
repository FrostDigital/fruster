import HttpPublisher from "../lib/publishers/HttpPublisher";

const rp = require("request-promise");

describe("HttpPublisher", () => {
	const port = 3333;

	describe("when creating its own HTTP server", () => {
		let publisher;

		beforeAll(() => {
			publisher = new HttpPublisher({
				port: port,
			});
		});

		afterAll(() => {
			publisher.stop();
		});

		it("should pass health check", (done) => {
			publisher.publishSuccess({
				healthy: true,
			});

			rp(`http://localhost:${port}/healthz`).then((resp) => {
				done();
			});
		});

		it("should fail health check", (done) => {
			publisher.publishFailure({
				healthy: false,
			});

			rp(`http://localhost:${port}/healthz`).catch((resp) => {
				expect(resp.statusCode).toBe(500);
				done();
			});
		});
	});
});
