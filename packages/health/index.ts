import conf from "./conf";
import * as log from "@fruster/log";
import HealthCheck from "./lib/HealthCheck";
import frusterBus from "@fruster/bus";

let hc: HealthCheck;

export const start = (bus?: typeof frusterBus) => {
	log.info("Starting health checks (grace period " + conf.gracePeriod + ")");

	hc = new HealthCheck({
		exposeHttpEndpoint: conf.exposeHttp,
		appName: conf.appName,
		checkInterval: conf.checkInterval,
		gracePeriod: conf.gracePeriod,
		allowedFailedAttempts: conf.allowedFailedAttempts,
		busAddress: conf.bus,
		bus,
	});

	return hc.start();
};

export const getHealth = () => {
	if (!hc) {
		log.warn("Health check not started");
		return;
	}

	return hc.getHealth();
};

export const fail = (reason: string) => {
	if (!hc) {
		log.warn("Health check not started");
		return;
	}

	return hc.fail(reason);
};
