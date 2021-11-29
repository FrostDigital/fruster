import bus from "../index";
import { startNatsServerAndConnectBus, TestConnection } from "./support/test-utils";

describe("Subscribe internal routing", () => {
	let natsConnection: TestConnection;

	beforeAll(async () => {
		natsConnection = await startNatsServerAndConnectBus();
	});

	afterAll(() => {
		natsConnection.server.kill();
		bus.closeAll();
	});

	it("should route to handler using internal routing", async () => {
		// Note: All subscribes will echo subject back
		const getUserFooSubject = "http.get.user.foo";
		const getUserByIdSubject = "http.get.user.:id";
		const getUserBarSubject = "http.get.user.bar";

		[getUserFooSubject, getUserByIdSubject, getUserBarSubject].forEach((subject) => {
			bus.subscribe({
				subject,
				requestSchema: {
					id: subject,
					type: "object",
				},
				responseSchema: {
					id: subject + "-response",
					type: "string",
				},
				handle: () => {
					return {
						data: subject,
					};
				},
			});
		});

		const getUserFooResp = await bus.request({
			subject: getUserFooSubject,
			message: { reqId: "reqId", data: {} },
		});

		const getUserByIdResp = await bus.request({
			subject: getUserByIdSubject,
			message: { reqId: "reqId", data: {} },
		});

		const getUserBarResp = await bus.request({
			subject: getUserBarSubject,
			message: { reqId: "reqId", data: {} },
		});

		expect(getUserFooResp.data).toBe(getUserFooSubject);
		expect(getUserByIdResp.data).toBe(getUserByIdSubject);
		expect(getUserBarResp.data).toBe(getUserBarSubject);
	});
});
