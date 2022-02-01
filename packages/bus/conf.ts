import uuid from "uuid";
import constants from "./constants";

const conf = {
	// Name of *this* service
	serviceName: getServiceName(),

	// Path to directory where JSON schemas are located relative to application root
	schemasPath: process.env.SCHEMAS_PATH || "/lib/schemas",

	// Generated id of service instance
	instanceId: getServiceName() + "." + uuid.v4().substr(0, 8),

	// Whether or not to validate responses
	responseValidation: process.env.RESPONSE_VALIDATION === "true",

	// Treshold for when fruster-bus will compress (gzip) data
	compressTreshold: parseInt(process.env.COMPRESS_TRESHOLD || 1024 * 900 + ""),

	// Chunks size, if message needs to be chunked each message data will be
	// max this size
	chunkSize: parseInt(process.env.CHUNK_SIZE || 1024 * 900 + ""),

	// Timeout in ms for when chunks should have been delivered. If not all chunks
	// has been delivered within this time frame the delivery is considered to have failed.
	chunkTimeout: parseInt(process.env.CHUNK_TIMEOUT_MS || 1000 * 5 + ""),

	// How fruster-bus will handle compression of data
	// `manual` - compression will only be done if `dataEncoding` is set to a supported value (currently only `gzip` is supported)
	// `auto` - compression will happen automatically based on outgoing message size as configured in `COMPRESS_TRESHOLD`
	compressionStrategy: process.env.COMPRESSION_STRATEGY || constants.COMPRESSION_STRATEGY_AUTO,

	// If to disable that schemas are cached in memory when initialized multiple times
	// This would in most cases be kept as true to speed up testing.
	disableSchemaCache: process.env.DISABLE_SCHEMA_CACHE === "true",

	logLevel: (process.env.LOG_LEVEL || "info").toLowerCase(),
};

function getServiceName() {
	return process.env.SERVICE_NAME || process.env.DEIS_APP || "n/a";
}

if (conf.compressTreshold > conf.chunkSize) {
	// Chunking should only be used after data has been compressed
	throw new Error(
		`COMPRESS_TRESHOLD must be less than or equal CHUNK_TRESHOLD, current values are ${conf.compressTreshold} and ${conf.chunkTreshold}`
	);
}

export default conf;
