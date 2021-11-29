const uuid = require("uuid");
const constants = require("./constants").default;

module.exports = {
	// Time we expect to get options respons
	optionsTimeout: process.env.OPTIONS_TIMEOUT || "1s",

	// Name of *this* service
	serviceName: getServiceName(),

	// Path to directory where JSON schemas are located relative to application root
	schemasPath: process.env.SCHEMAS_PATH || "/lib/schemas",

	// Generated id of service instance
	instanceId: getServiceName() + "." + uuid.v4().substr(0, 8),

	// Log level for incoming and outgoing messages
	busLogLevel: (process.env.BUS_LOG_LEVEL || "silly").toLowerCase(),

	// Whether or not to validate responses
	responseValidation: process.env.RESPONSE_VALIDATION === "true",

	// Treshold for when fruster-bus will compress (gzip) data
	compressTreshold: parseInt(process.env.COMPRESS_TRESHOLD || 1024 * 900 + ""),

	// How fruster-bus will handle compression of data
	// `manual` - compression will only be done if `dataEncoding` is set to a supported value (currently only `gzip` is supported)
	// `auto` - compression will happen automatically based on outgoing message size as configured in `COMPRESS_TRESHOLD`
	compressionStrategy: process.env.COMPRESSION_STRATEGY || constants.COMPRESSION_STRATEGY_AUTO,

	// If to disable that schemas are cached in memory when initialized multiple times
	// This would in most cases be kept as true to speed up testing.
	disableSchemaCache: process.env.DISABLE_SCHEMA_CACHE === "true",
};

function getServiceName() {
	return process.env.SERVICE_NAME || process.env.DEIS_APP || "n/a";
}
