import { hasHealthProbe, removeHealthProbe } from "../lib/file-util";
import HealthCheck, { HealthStatus } from "../lib/HealthCheck";
const nsc = require("nats-server-control");

describe("Health check", () => {
	let healthCheck: HealthCheck;
	let busAddress: string;
	let busPort: number;
	let natsServer;

	beforeEach((done) => {
		busPort = Math.floor(Math.random() * 6000 + 2000);
		busAddress = "nats://localhost:" + busPort;

		removeHealthProbe();

		nsc.startServer(busPort)
			.then((oServer) => {
				natsServer = oServer;
			})
			.then(done)
			.catch(done.fail);
	});

	afterEach(() => {
		if (natsServer) {
			natsServer.kill();
		}
	});

	it("should create instance", () => {
		healthCheck = new HealthCheck({
			appName: "appName",
			checkInterval: "1s",
			busAddress,
		});

		expect(healthCheck.subject).toMatch("health.appName.");
		expect(healthCheck.started).toBeDefined();
		expect(healthCheck.checkInterval).toBe(1000);
		expect(healthCheck.healthy).toBe(-1);
	});

	it("should send and receive health ping and write health probe file", (done) => {
		healthCheck = new HealthCheck({
			checkInterval: "1s",
			appName: "appName",
			busAddress,
		});

		healthCheck.start().then(() => {
			setTimeout(() => {
				expect(healthCheck.healthy).toBe(HealthStatus.healthy);
				expect(healthCheck.numPings).toBeGreaterThan(0);
				expect(hasHealthProbe()).toBe(true);
				done();
			}, 1500);
		});
	});

	it("should add failure and remove health probe file", (done) => {
		healthCheck = new HealthCheck({
			checkInterval: "1s",
			appName: "appName",
			busAddress,
		});

		healthCheck.start().then(() => {
			setTimeout(() => {
				healthCheck.addFailure();

				expect(healthCheck.healthy).toBe(HealthStatus.unhealthy);
				expect(hasHealthProbe()).toBe(false);

				done();
			}, 1500);
		});
	});

	it("should not send health checks during grace period", (done) => {
		healthCheck = new HealthCheck({
			checkInterval: "10ms",
			appName: "appName",
			busAddress,
			gracePeriod: "1s",
		});

		healthCheck.start().then(() => {
			setTimeout(() => {
				expect(healthCheck.healthy).toBe(-1);
				expect(hasHealthProbe()).toBe(false);
				expect(healthCheck.numPings).toBeFalsy();

				done();
			}, 500);
		});
	});

	it("should fail health manually", (done) => {
		healthCheck = new HealthCheck({
			checkInterval: "1s",
			appName: "appName",
			busAddress,
		});

		healthCheck.start().then(() => {
			setTimeout(() => {
				healthCheck.fail("Foo reason");

				expect(healthCheck.healthy).toBe(HealthStatus.unhealthy);
				expect(healthCheck.reason).toBe("Foo reason");
				expect(hasHealthProbe()).toBe(false);

				done();
			}, 1500);
		});
	});
});
