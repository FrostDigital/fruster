import { spawn } from "child_process";
import { Client } from "nats";
import bus from "../../index";

export function startNatsServer(port?: number) {
	return new Promise<TestConnection>((resolve, reject) => {
		const natsServerPort = port || Math.floor(Math.random() * 60000 + 2000);
		const natsUrl = "nats://localhost:" + natsServerPort;

		const natsProcess = spawn("nats-server", ["-p", natsServerPort.toString()], {
			stdio: "ignore", // change to "inherit" to debug
		});

		natsProcess.on("error", (error) => {
			console.log(error);
			reject(error);
		});

		natsProcess.on("close", (code) => {
			if (code !== 0) {
				reject(new Error(`NATS server exited with code ${code}`));
			}
		});

		setTimeout(() => {
			resolve({
				server: {
					kill: () => {
						return new Promise<void>((resolveKill) => {
							natsProcess.on("close", () => {
								resolveKill();
							});

							natsProcess.kill();
						});
					},
				},
				natsUrl,
				port: natsServerPort,
			});
		}, 250);
	});
}
export interface TestConnection {
	server: {
		kill: () => Promise<void>;
	};
	client?: Client;
	natsUrl: string;
	port: number;
}

export const startNatsServerAndConnectBus = (port?: number, schemasDir?: string): Promise<TestConnection> => {
	const natsServerPort = port || Math.floor(Math.random() * 60000 + 2000);
	const natsUrl = "nats://localhost:" + natsServerPort;

	let connection: TestConnection = {
		// @ts-ignore
		server: undefined,
		client: undefined,
		natsUrl: natsUrl,
		port: natsServerPort,
	};

	return startNatsServer(natsServerPort)
		.then((natsServer) => {
			connection.server = natsServer.server;
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
