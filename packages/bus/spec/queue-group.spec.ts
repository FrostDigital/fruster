import bus from "../index";
import { startNatsServerAndConnectBus, TestConnection } from "./support/test-utils";
import * as uuid from "uuid";
import path from "path";
import { spawn } from "child_process";

jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;

describe("Queue group", function () {
	let subject: string;
	let natsConnection: TestConnection;

	beforeEach(() => {
		subject = uuid.v4();
	});

	beforeAll(async () => {
		natsConnection = await startNatsServerAndConnectBus();
	});

	afterAll(function () {
		natsConnection.server.kill();
		bus.closeAll();
	});

	it("should form a queue group when subscribing", async () => {
		let replies = 0;

		function handle(gotMessage: boolean) {
			if (gotMessage) {
				replies++;
			}
		}
		spawnClient(natsConnection.port, subject, true).then(handle);
		spawnClient(natsConnection.port, subject, true).then(handle);

		await wait(4000);

		bus.publish({
			subject,
			message: {
				foo: "bar",
				reqId: "reqId",
			},
		});

		await wait(1000);

		expect(replies).toBe(1);
	});

	it("should not form a queue group when subscribing", async () => {
		let replies = 0;

		function handle(gotMessage: boolean) {
			if (gotMessage) {
				replies++;
			}
		}
		spawnClient(natsConnection.port, subject, false).then(handle);
		spawnClient(natsConnection.port, subject, false).then(handle);

		await wait(4000);

		console.log("Publishing message to", subject);
		bus.publish({
			subject,
			message: {
				foo: "bar",
				reqId: "reqId",
			},
		});

		await wait(1000);

		expect(replies).toBe(2);
	});
});

function spawnClient(natsPort: number, subject: string, createQueueGroup: boolean) {
	const clientPath = path.join(__dirname, "support", "test-client.ts");

	let spawned = spawn(path.join("node_modules", ".bin", "ts-node"), [clientPath], {
		env: Object.assign(process.env, {
			PORT: natsPort,
			SUBJECT: subject,
			CREATE_QUEUE_GROUP: createQueueGroup,
		}),
	});

	spawned.stdout.on("data", (data) => {
		console.log(`spawned stdout: ${data}`);
	});

	spawned.stderr.on("data", (data) => {
		console.log(`spawned stderr: ${data}`);
	});

	return new Promise<boolean>((resolve, reject) => {
		spawned.on("close", (exitCode) => {
			let gotMessage = exitCode == 0;
			resolve(gotMessage);
		});
	});
}

const wait = async (duration: number) => {
	return new Promise((resolve) => {
		setTimeout(resolve, duration);
	});
};
