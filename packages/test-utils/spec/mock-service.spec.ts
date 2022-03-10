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

	it("should throw error if invoked more times than responses are defined", async () => {
		testUtils.mockService({
			subject: "foo-service.hello",
			responses: [
				{
					status: 200,
					data: 1,
				},
			],
		});

		await bus.request({
			subject: "foo-service.hello",
			message: {
				reqId: "reqId",
				data: {},
			},
		});

		try {
			await bus.request({
				subject: "foo-service.hello",
				message: {
					reqId: "reqId",
					data: {},
				},
			});

			fail("Should not get this far");
		} catch (e: any) {
			expect(e.error.code).toBe("MOCK_ERROR");
		}
	});
});
