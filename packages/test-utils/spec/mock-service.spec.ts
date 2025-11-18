import testUtils from "../";
import bus from "@fruster/bus";

const testBus = bus.testBus;

describe("Mock service", () => {
	testUtils.startBeforeEach({
		bus: bus,
		mockNats: true,
	});

	it("should throw error if no response is set", () => {
		try {
			testUtils.mockService({
				subject: "foo-service.hello",
			});

			fail("should not get this far");
		} catch (err) {}
	});

	it("should mock service", async () => {
		const mockService = testUtils.mockService({
			subject: "foo-service.hello",
			response: {
				status: 200,
				data: "world",
			},
		});

		const { status, data } = await testBus.request({
			subject: "foo-service.hello",
			message: {
				reqId: "reqId",
				data: "world",
			},
		});

		expect(status).toBe(200);
		expect(data).toBe("world");

		expect(mockService.invocations).toBe(1);
		expect(mockService.requests[0].data).toBe("world");
		expect(mockService.publishedResponses[0].data).toBe("world");
	});

	it("should mock service and respond with with response from callback", async () => {
		const mock = testUtils.mockService({
			subject: "foo-service.hello",
			response: () => {
				return {
					status: 200,
					data: "world",
				};
			},
		});

		const { status, data } = await bus.request({
			subject: "foo-service.hello",
			message: {
				reqId: "reqId",
				data: "world",
			},
		});

		expect(status).toBe(200);
		expect(data).toBe("world");
		expect(mock.invocations).toBe(1);
	});

	it("should mock sequence of responses", async () => {
		const mockService = testUtils.mockService({
			subject: "foo-service.hello",
			responses: [
				{
					status: 200,
					data: 1,
				},
				{
					status: 200,
					data: 2,
				},
			],
		});

		const resp1 = await bus.request({
			subject: "foo-service.hello",
			message: {
				reqId: "reqId",
				data: {},
			},
		});

		const resp2 = await bus.request({
			subject: "foo-service.hello",
			message: {
				reqId: "reqId",
				data: {},
			},
		});

		expect(mockService.invocations).toBe(2);

		expect(resp1.status).toBe(200);
		expect(resp1.data).toBe(1);
		expect(mockService.publishedResponses[0].data).toBe(1);

		expect(resp2.status).toBe(200);
		expect(resp2.data).toBe(2);
		expect(mockService.publishedResponses[1].data).toBe(2);
	});

	it("should auto-unsubscribe after single response in array (legacy behavior verification)", async () => {
		const mock = testUtils.mockService({
			subject: "foo-service.hello",
			responses: [
				{
					status: 200,
					data: 1,
				},
			],
		});

		const resp = await bus.request({
			subject: "foo-service.hello",
			message: {
				reqId: "reqId",
				data: {},
			},
		});

		expect(resp.data).toBe(1);
		expect(mock.invocations).toBe(1);

		// After the first (and only) response, mock should auto-unsubscribe
		// Creating a new mock verifies the old one is gone
		const mock2 = testUtils.mockService({
			subject: "foo-service.hello",
			response: {
				status: 200,
				data: 2,
			},
		});

		const resp2 = await bus.request({
			subject: "foo-service.hello",
			message: {
				reqId: "reqId2",
				data: {},
			},
		});

		expect(resp2.data).toBe(2);
		expect(mock.invocations).toBe(1); // Old mock didn't receive the request
		expect(mock2.invocations).toBe(1);
	});

	describe("Subscription management", () => {
		it("should allow manual unsubscribe and re-mocking same subject", async () => {
			// Create first mock
			const mock1 = testUtils.mockService({
				subject: "foo-service.test",
				response: { status: 200, data: "first" },
			});

			const resp1 = await bus.request({
				subject: "foo-service.test",
				message: { reqId: "1", data: {} },
			});

			expect(resp1.data).toBe("first");
			expect(mock1.invocations).toBe(1);

			// Unsubscribe first mock
			mock1.unsubscribe();

			// Create second mock for same subject
			const mock2 = testUtils.mockService({
				subject: "foo-service.test",
				response: { status: 200, data: "second" },
			});

			const resp2 = await bus.request({
				subject: "foo-service.test",
				message: { reqId: "2", data: {} },
			});

			expect(resp2.data).toBe("second");
			expect(mock2.invocations).toBe(1);
			expect(mock1.invocations).toBe(1); // First mock should not have received the second request
		});

		it("should auto-unsubscribe after last response when using responses array", async () => {
			const mock = testUtils.mockService({
				subject: "foo-service.auto",
				responses: [
					{ status: 200, data: 1 },
					{ status: 200, data: 2 },
				],
			});

			await bus.request({
				subject: "foo-service.auto",
				message: { reqId: "1", data: {} },
			});

			await bus.request({
				subject: "foo-service.auto",
				message: { reqId: "2", data: {} },
			});

			// Mock should have auto-unsubscribed after second response
			// Create new mock for same subject to verify old one is unsubscribed
			const mock2 = testUtils.mockService({
				subject: "foo-service.auto",
				response: { status: 200, data: 3 },
			});

			const resp = await bus.request({
				subject: "foo-service.auto",
				message: { reqId: "3", data: {} },
			});

			expect(resp.data).toBe(3);
			expect(mock.invocations).toBe(2); // Old mock should not have received request
			expect(mock2.invocations).toBe(1);
		});

		it("should auto-unsubscribe after first response when autoUnsubscribe is true", async () => {
			const mock = testUtils.mockService({
				subject: "foo-service.one-shot",
				response: { status: 200, data: "once" },
				autoUnsubscribe: true,
			});

			const resp1 = await bus.request({
				subject: "foo-service.one-shot",
				message: { reqId: "1", data: {} },
			});

			expect(resp1.data).toBe("once");
			expect(mock.invocations).toBe(1);

			// Create new mock for same subject
			const mock2 = testUtils.mockService({
				subject: "foo-service.one-shot",
				response: { status: 200, data: "twice" },
			});

			const resp2 = await bus.request({
				subject: "foo-service.one-shot",
				message: { reqId: "2", data: {} },
			});

			expect(resp2.data).toBe("twice");
			expect(mock.invocations).toBe(1); // Old mock should not have received request
			expect(mock2.invocations).toBe(1);
		});

		it("should safely handle multiple unsubscribe calls", () => {
			const mock = testUtils.mockService({
				subject: "foo-service.safe",
				response: { status: 200, data: "test" },
			});

			// Should not throw
			mock.unsubscribe();
			mock.unsubscribe();
			mock.unsubscribe();
		});

		it("should support chaining mocks with late-bound data", async () => {
			let dynamicValue = "initial";

			// First mock
			const mock1 = testUtils.mockService({
				subject: "foo-service.dynamic",
				response: { status: 200, data: dynamicValue },
			});

			const resp1 = await bus.request({
				subject: "foo-service.dynamic",
				message: { reqId: "1", data: {} },
			});

			expect(resp1.data).toBe("initial");

			// Change value and create new mock
			dynamicValue = "updated";
			mock1.unsubscribe();

			const mock2 = testUtils.mockService({
				subject: "foo-service.dynamic",
				response: () => ({ status: 200, data: dynamicValue }),
			});

			const resp2 = await bus.request({
				subject: "foo-service.dynamic",
				message: { reqId: "2", data: {} },
			});

			expect(resp2.data).toBe("updated");
		});
	});

	describe("Dynamic response updates", () => {
		it("should update response using setResponse()", async () => {
			const mock = testUtils.mockService({
				subject: "foo-service.update",
				response: { status: 200, data: "original" },
			});

			const resp1 = await bus.request({
				subject: "foo-service.update",
				message: { reqId: "1", data: {} },
			});

			expect(resp1.data).toBe("original");

			// Update response
			mock.setResponse({ status: 200, data: "updated" });

			const resp2 = await bus.request({
				subject: "foo-service.update",
				message: { reqId: "2", data: {} },
			});

			expect(resp2.data).toBe("updated");
			expect(mock.invocations).toBe(2);
		});

		it("should update response using callback function with setResponse()", async () => {
			let counter = 0;
			const mock = testUtils.mockService({
				subject: "foo-service.callback",
				response: { status: 200, data: 0 },
			});

			// Update to callback
			mock.setResponse(() => {
				counter++;
				return { status: 200, data: counter };
			});

			const resp1 = await bus.request({
				subject: "foo-service.callback",
				message: { reqId: "1", data: {} },
			});

			const resp2 = await bus.request({
				subject: "foo-service.callback",
				message: { reqId: "2", data: {} },
			});

			expect(resp1.data).toBe(1);
			expect(resp2.data).toBe(2);
			expect(mock.invocations).toBe(2);
		});

		it("should throw error when calling setResponse() with responses array", () => {
			const mock = testUtils.mockService({
				subject: "foo-service.error",
				responses: [{ status: 200, data: 1 }],
			});

			expect(() => {
				mock.setResponse({ status: 200, data: 2 });
			}).toThrowError(
				/Cannot call setResponse\(\) when using responses array/
			);
		});

		it("should update responses array using setResponses()", async () => {
			const mock = testUtils.mockService({
				subject: "foo-service.array-update",
				responses: [{ status: 200, data: 1 }],
			});

			const resp1 = await bus.request({
				subject: "foo-service.array-update",
				message: { reqId: "1", data: {} },
			});

			expect(resp1.data).toBe(1);
			expect(mock.invocations).toBe(1);

			// Mock auto-unsubscribed after first response
			// Need to manually re-subscribe by creating a new mock instance
			// For this test, let's verify setResponses works before auto-unsubscribe triggers

			const mock2 = testUtils.mockService({
				subject: "foo-service.array-update-2",
				responses: [
					{ status: 200, data: 1 },
					{ status: 200, data: 2 },
				],
			});

			// First request
			await bus.request({
				subject: "foo-service.array-update-2",
				message: { reqId: "1", data: {} },
			});

			expect(mock2.invocations).toBe(1);

			// Update responses - this should reset counters and prevent auto-unsubscribe from old array
			mock2.setResponses([
				{ status: 200, data: 10 },
				{ status: 200, data: 20 },
			]);

			expect(mock2.invocations).toBe(0); // Counters reset

			const resp2 = await bus.request({
				subject: "foo-service.array-update-2",
				message: { reqId: "2", data: {} },
			});

			const resp3 = await bus.request({
				subject: "foo-service.array-update-2",
				message: { reqId: "3", data: {} },
			});

			expect(resp2.data).toBe(10);
			expect(resp3.data).toBe(20);
			expect(mock2.invocations).toBe(2);
		});

		it("should throw error when calling setResponses() with single response", () => {
			const mock = testUtils.mockService({
				subject: "foo-service.error2",
				response: { status: 200, data: 1 },
			});

			expect(() => {
				mock.setResponses([{ status: 200, data: 2 }]);
			}).toThrowError(
				/Cannot call setResponses\(\) when using single response/
			);
		});
	});
});
