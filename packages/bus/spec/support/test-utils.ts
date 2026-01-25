import { spawn, spawnSync } from "child_process";
import { Client } from "nats";
import bus from "../../index";

/**
 * Check if NATS server binary is available on the system
 */
export function isNatsServerAvailable(): boolean {
	try {
		const result = spawnSync("nats-server", ["--version"], {
			stdio: "ignore",
		});
		return result.status === 0;
	} catch {
		return false;
	}
}

export function startNatsServer(port?: number) {
	return new Promise<TestConnection>((resolve, reject) => {
		const natsServerPort = port || Math.floor(Math.random() * 60000 + 2000);
		const natsUrl = "nats://localhost:" + natsServerPort;

		// Check if NATS server is available
		if (!isNatsServerAvailable()) {
			const error = new Error(
				"NATS server is not installed or not in PATH. " +
				"Install it from https://docs.nats.io/running-a-nats-service/introduction/installation"
			);
			(error as any).code = "NATS_NOT_INSTALLED";
			reject(error);
			return;
		}

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

/**
 * Skip a test suite with a warning if NATS server is not available.
 * Returns true if tests should be skipped, false otherwise.
 *
 * Usage in spec files:
 * ```
 * describe("My Test", () => {
 *   if (skipIfNatsNotAvailable()) return;
 *   // ... rest of the tests
 * });
 * ```
 */
export function skipIfNatsNotAvailable(): boolean {
	if (!isNatsServerAvailable()) {
		console.warn("\n⚠️  WARNING: NATS server is not installed - skipping tests that require it");
		console.warn("   Install from: https://docs.nats.io/running-a-nats-service/introduction/installation");
		console.warn("   Or on macOS: brew install nats-server\n");
		return true;
	}
	return false;
}
