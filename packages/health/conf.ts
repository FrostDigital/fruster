export default {
	// NATS servers, set multiple if using cluster
	// Example: `['nats://10.23.45.1:4222', 'nats://10.23.41.8:4222']`
	bus: process.env.BUS || "nats://localhost:4222",

	// Interval that health checks will be performed
	checkInterval: process.env.HEALTH_CHECK_INTERVAL || "30s",

	// Time period to wait until service has started and health check should be started
	gracePeriod: process.env.HEALTH_CHECK_GRACE_PERIOD || "2s",

	// Consecutive failed attempts that is allowed
	allowedFailedAttempts: Number(process.env.ALLOWED_FAILED_ATTEMPTS || 0),

	// Name of app/service
	appName:
		process.env.APP_NAME ||
		process.env.DEIS_APP ||
		process.env.SERVICE_NAME ||
		"na",

	// Env variable SOURCE_VERSION is set by Deis during runtime/container build time
	appVersion: process.env.SOURCE_VERSION || "n/a",

	// If health HTTP endpoint will be created and exposed on
	// configure path and port
	exposeHttp: process.env.EXPOSE_HEALTH_HTTP === "true",

	// Port health http server will listen to
	port: Number(process.env.HEALTH_PORT || 3200),

	// Path to where health is exposes over HTTP
	path: process.env.HEALTH_PATH || "/healthz",
};
