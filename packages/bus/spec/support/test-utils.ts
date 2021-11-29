const nsc = require("nats-server-control");
import { Client } from "nats";
import bus from "../../index";

export const startNatsServer = (port?: number) => {
	const natsServerPort = port || Math.floor(Math.random() * 60000 + 2000);
	const natsUrl = "nats://localhost:" + natsServerPort;

	let connection = {
		server: null,
		natsUrl: natsUrl,
		port: natsServerPort,
	};

	return nsc.startServer(natsServerPort).then((natsServer: any) => {
		connection.server = natsServer;
		return connection;
	});
};

export interface TestConnection {
	server?: any;
	client?: Client;
	natsUrl: string;
	port: number;
}

export const startNatsServerAndConnectBus = (port?: number, schemasDir?: string): Promise<TestConnection> => {
	const natsServerPort = port || Math.floor(Math.random() * 60000 + 2000);
	const natsUrl = "nats://localhost:" + natsServerPort;

	let connection: TestConnection = {
		server: undefined,
		client: undefined,
		natsUrl: natsUrl,
		port: natsServerPort,
	};

	return nsc
		.startServer(natsServerPort)
		.then((natsServer: any) => {
			connection.server = natsServer;
			return connection;
		})
		.then(() =>
			bus.connect({
				address: natsUrl,
				schemasDir,
			})
		)
		.then((connectedNatsClient: Client) => {
			connection.client = connectedNatsClient;
			return connection;
		});
};

export const wait = async (duration: number) => {
	return new Promise((resolve) => {
		setTimeout(resolve, duration);
	});
};
