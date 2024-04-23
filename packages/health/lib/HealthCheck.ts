import bus, { CreateFrusterRequest, FrusterRequest } from "@fruster/bus";
import log from "@fruster/log";
import ms from "ms";
import { v4 } from "uuid";
import conf from "../conf";
import FileSystemPublisher from "./publishers/FileSystemPublisher";
import HttpPublisher from "./publishers/HttpPublisher";

export enum HealthStatus {
	notSet = -1,
	healthy = 1,
	unhealthy = 0,
}

interface HealthCheckOptions {
	checkInterval: string;
	gracePeriod?: string;
	busAddress: string;
	appName: string;
	allowedFailedAttempts?: number;
	exposeHttpEndpoint?: boolean;

	/**
	 * Optionally pass in fruster bus instance.
	 * Will not attempt to connect if already connected.
	 */
	bus?: typeof bus;
}

interface PingRequest {
	pingId: string;
	app: string;
	appVersion: string;
	started: Date;
	bus: string;
	instanceId: string;
}

class HealthCheck {
	subject: string;
	started = new Date();
	healthy: HealthStatus = HealthStatus.notSet;
	checkInterval: number;
	numPings = 0;
	reason?: string;

	private gracePeriod: number;
	private busAddress: string;
	private appName: string;
	private instanceId = v4().substr(0, 8);
	private allowedFailedAttempts: number;
	private publishers: (FileSystemPublisher | HttpPublisher)[];

	private failedConsecutiveAttempts = 0;
	private lastPingId?: string;
	private lastSuccess?: Date;
	private lastFailure?: Date;
	private timer?: NodeJS.Timeout;

	private bus: typeof bus;

	constructor(options: HealthCheckOptions) {
		this.checkInterval = ms(options.checkInterval);
		this.gracePeriod = ms(options.gracePeriod || "0s");
		this.busAddress = options.busAddress;
		this.bus = options.bus || bus;
		this.appName = options.appName;
		this.subject = `health.${this.appName}.${this.instanceId}`;
		this.allowedFailedAttempts = options.allowedFailedAttempts || 0;

		this.publishers = this.createPublishers(options.exposeHttpEndpoint);
	}

	async start() {
		if (!this.bus.status.connected) {
			await this.bus.connect(this.busAddress);
		}

		this.bus.subscribe(this.subject, this.handlePing);

		setTimeout(() => {
			this.timer = setInterval(() => this.ping(), this.checkInterval);
		}, this.gracePeriod);
	}

	stop() {
		if (this.timer) {
			clearInterval(this.timer);
		}

		this.publishers.forEach((publisher) => publisher.stop());
	}

	private createPublishers(exposeHttp?: boolean) {
		let publishers = [new FileSystemPublisher()];

		if (exposeHttp) {
			publishers.push(new HttpPublisher());
		}

		return publishers;
	}

	private ping() {
		if (!this.bus.status.connected) {
			// Note: This is needed since NATS client may be in closed state and lost all
			// prior subs, but still pass ping check since this creates a new subscription.
			log.error("Connection to NATS was lost");
			this.addFailure();
			return;
		}

		this.lastPingId = v4();

		const msg: CreateFrusterRequest<PingRequest> = {
			reqId: v4(),
			data: {
				pingId: this.lastPingId,
				app: this.appName,
				appVersion: conf.appVersion,
				started: this.started,
				bus: this.busAddress,
				instanceId: this.instanceId,
			},
		};

		this.bus.publish({ subject: this.subject, message: msg });
	}

	private handlePing = (req: FrusterRequest<PingRequest>) => {
		this.numPings += 1;

		if (req.data.pingId == this.lastPingId) {
			this.addSuccess();
		} else {
			this.addFailure();
		}
	};

	addSuccess() {
		log.silly("Health check passed");
		this.healthy = HealthStatus.healthy;
		this.failedConsecutiveAttempts = 0;
		this.lastSuccess = new Date();
		this.publishers.forEach((publisher) =>
			publisher.publishSuccess(this.getHealth())
		);
	}

	addFailure() {
		this.healthy = HealthStatus.unhealthy;
		this.failedConsecutiveAttempts++;
		this.lastFailure = new Date();
		log.warn(
			"Health check failed, attempt #" + this.failedConsecutiveAttempts
		);

		if (this.failedConsecutiveAttempts > this.allowedFailedAttempts) {
			log.warn(
				"Health check failed more than",
				this.allowedFailedAttempts,
				"times"
			);
			this.publishFailure();
		}
	}

	/**
	 * Explicitly fail healtchecks. This can be used if service has specific conditions
	 * that should fail healthchecks apart from default bus ping.
	 */
	fail(reason: string) {
		this.stop();
		this.healthy = HealthStatus.unhealthy;
		this.reason = reason;
		this.publishFailure();
	}

	private publishFailure() {
		log.error(`Apps is unhealthy${this.reason ? ": " + this.reason : ""}`);
		this.publishers.forEach((publisher) =>
			publisher.publishFailure(this.getHealth())
		);
	}

	getHealth() {
		return {
			healthy: this.healthy,
			started: this.started,
			app: this.appName,
			instanceId: this.instanceId,
			appVersion: conf.appVersion,
			failedConsecutiveAttempts: this.failedConsecutiveAttempts,
			lastSuccess: this.lastSuccess,
			lastFailure: this.lastFailure,
			reason: this.reason || "n/a",
		};
	}
}

export default HealthCheck;
