import conf from "../conf";
import bus from "../index";
import { foo } from "./support/1mb";
import { startNatsServerAndConnectBus } from "./support/test-utils";

const { testBus } = bus;

describe("Chunking", () => {
	let oldCompressThreshold = conf.compressThreshold;
	let oldChunkSize = conf.chunkSize;

	beforeAll(async () => {
		conf.compressThreshold = 10;
		conf.chunkSize = 10;
		await startNatsServerAndConnectBus();
	});

	afterAll(() => {
		conf.compressThreshold = oldCompressThreshold;
		conf.chunkSize = oldChunkSize;

		bus.closeAll();
	});

	it("should chunk large messages", async () => {
		const subject = "chunky-salsa";

		const largeMessage = foo;

		const largeMessageLength = JSON.stringify(largeMessage).length;

		testBus.subscribe<string[]>({
			subject,
			handle: (req) => {
				expect(JSON.stringify(req.data).length).toBe(largeMessageLength);
				return {
					data: largeMessage,
				};
			},
		});

		const res = await testBus.request<string[], string[]>({
			subject,
			message: {
				data: largeMessage,
			},
		});

		expect(JSON.stringify(res.data).length).toBe(largeMessageLength);
	});
});
