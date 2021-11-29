import bus from "../index";
import { startNatsServer } from "./support/test-utils";

describe("bus options", () => {
	afterEach(async (done) => {
		await bus.closeAll();
		bus.clearClients();

		done();
	});

	afterAll(async (done) => {
		await bus.closeAll();
		bus.clearClients();

		done();
	});

	it("should be possible to connect using an array of bus addresses", async () => {
		let natsConnection;

		const connection = await startNatsServer();
		natsConnection = connection;

		try {
			await bus.connect({
				address: [natsConnection.natsUrl],
				schemasDir: "/spec/support/test-schemas",
			});
		} catch (err) {
			expect(err).toBeUndefined();
		} finally {
			natsConnection.server.kill();
			bus.closeAll();
		}
	});

	it("should be possible to use a client as singleton", async () => {
		const client1 = await bus.connect({
			address: "nats://mock",
			singleton: true,
			schemasDir: "/spec/support/test-schemas",
		});

		let client2 = await bus.connect({
			address: "nats://mock",
			singleton: true,
			schemasDir: "/spec/support/test-schemas-yam",
		});

		expect(client1.busOptions?.singleton).toBeTruthy();
		expect(client2.busOptions?.singleton).toBeTruthy();

		expectObj(client1, client2);
	});
});

function expectObj(objA: any, objB: any) {
	Object.keys(objA).forEach((key) => {
		if (objA[key] && (typeof objA[key] === "object" || objA[key] instanceof Array)) expectObj(objA[key], objB[key]);
		else expect(objA[key]).toBe(objB[key], key);
	});
}
