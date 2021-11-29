import nats, { Client } from "nats";

export interface ConnectParams {
	address: string | string[];
}

export interface ConnectedClient extends Client {
	busOptions?: ConnectParams;
}

/**
 * Connects to NATS bus.
 *
 * Will connect to mocked, in-memory NATS if url is set to `nats://mock`
 */
export const connect = (options: ConnectParams) => {
	return new Promise((resolve, reject) => {
		let client: ConnectedClient;

		if (
			options.address === "nats://mock" ||
			options.address === "mock" ||
			options.address.includes("nats://mock") ||
			options.address.includes("mock")
		) {
			const mockNatsClient = require("mock-nats-client");
			client = mockNatsClient.connect({ json: true });
			client.busOptions = options;
			console.log("Connecting to mocked NATS bus");
		} else {
			client = nats.connect({
				servers: Array.isArray(options.address) ? options.address : [options.address],
				json: true,
			});
			// @ts-ignore
			client.busOptions = options;
			console.log("Connecting to NATS bus", options.address);
		}

		client.on("connect", () => {
			console.log("Successfully connected to NATS bus", options.address);
			resolve(client);
		});

		client.on("reconnecting", () => {
			console.log("Lost connection, reconnecting to bus...");
		});

		client.on("reconnect", () => {
			console.log("Reconnected to NATS bus", options.address);
		});

		client.on("error", (e: any) => {
			console.error("Error [" + client.busOptions?.address + "]: " + e);
			reject(e);
		});
	});
};
