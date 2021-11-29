import bus from "../index";
import { foo } from "./support/1mb";
import { startNatsServerAndConnectBus } from "./support/test-utils";

const { testBus } = bus;

describe("Chunking", () => {
	beforeAll(async () => {
		await startNatsServerAndConnectBus();
	});

	afterAll(() => {
		bus.closeAll();
	});

	fit("should chunk large messages", async () => {
		const subject = "chunky-salsa";
		const largeMessage = foo[0] + foo[0];

		testBus.subscribe({
			subject,
			handle: (req) => {
				expect(req.data.length).toBe(largeMessage.length);
				return {
					data: largeMessage,
				};
			},
		});

		const res = await testBus.request<string, string>({
			subject,
			message: {
				data: largeMessage,
			},
		});

		expect(res.data.length).toBe(largeMessage.length);
	});
});
