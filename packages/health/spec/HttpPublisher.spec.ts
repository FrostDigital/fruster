import HttpPublisher from "../lib/publishers/HttpPublisher";
import axios from "axios";

describe("HttpPublisher", () => {
	const port = 3333;

	describe("when creating its own HTTP server", () => {
		let publisher: HttpPublisher;

		beforeAll(() => {
			publisher = new HttpPublisher({
				port: port,
			});
		});

		afterAll(() => {
			publisher.stop();
		});

		it("should pass health check", async () => {
			publisher.publishSuccess({
				healthy: true,
			});

			const response = await axios.get(
				`http://localhost:${port}/healthz`
			);
			expect(response.status).toBe(200);
		});

		it("should fail health check", async () => {
			publisher.publishFailure({
				healthy: false,
			});

			try {
				await axios.get(`http://localhost:${port}/healthz`);
				expect(true).toBe(false);
			} catch (error) {
				if (axios.isAxiosError(error)) {
					expect(error.response?.status).toBe(500);
				}
			}
		});
	});
});
