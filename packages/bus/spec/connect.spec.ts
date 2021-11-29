import bus from "../index";
import { startNatsServer, TestConnection } from "./support/test-utils";

describe("Connect", function () {
	let natsConnection: TestConnection;

	beforeEach(async (done) => {
		try {
			const connection = await startNatsServer();
			natsConnection = connection;

			done();
		} catch (err) {
			console.error(err);
			done.fail();
		}
	});

	afterEach(() => {
		natsConnection.server.kill();
		bus.closeAll();
	});

	it("should connect and disconnect", async () => {
		await bus.connect(natsConnection.natsUrl);

		expect(bus.connected).toBeTruthy("bus.connected#1");
		expect(bus.closed).toBeFalsy("bus.closed#1");

		await bus.closeAll();

		expect(bus.closed).toBeTruthy("bus.closed#2");
		expect(bus.connected).toBeFalsy("bus.connected#2");
	});

	it("should connect and disconnect with bus address as an array", async () => {
		await bus.connect([natsConnection.natsUrl]);

		expect(bus.connected).toBeTruthy("bus.connected");
		expect(bus.closed).toBeFalsy("bus.closed");

		await bus.closeAll();

		expect(bus.closed).toBeTruthy("bus.closed");
		expect(bus.connected).toBeFalsy("bus.connected");
	});

	it("should throw error if faulty url was provided", async () => {
		try {
			// @ts-ignore
			await bus.connect(null);
			expect(true).toBe(false); // fail
		} catch (err: any) {
			expect(err).toBeDefined();
		}
	});

	it("should reconnect", async () => {
		await bus.connect(natsConnection.natsUrl);

		expect(bus.reconnecting).toBeFalsy("bus.reconnecting");

		await natsConnection.server.kill();

		await delay();

		expect(bus.reconnecting).toBeTruthy("should be reconnecting when server was killed");
		expect(bus.connected).toBeFalsy();

		await startNatsServer(natsConnection.port);

		await delay();

		expect(bus.reconnecting).toBeFalsy("should not be reconnecting anymore");
		expect(bus.connected).toBeTruthy("bus.connected");
	});

	it("should have status connected false if not yet connected", () => {
		expect(bus.connected).toBeFalsy("bus.connected");
		expect(bus.reconnecting).toBeFalsy("bus.reconnecting");
		expect(bus.closed).toBeTruthy("bus.closed");
	});
});

function delay(passOnObj?: any) {
	return new Promise((resolve) => {
		setTimeout(() => resolve(passOnObj), 1500);
	});
}
