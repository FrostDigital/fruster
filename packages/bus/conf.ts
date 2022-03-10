import * as uuid from "uuid";
import constants from "./constants";

const conf = {
	// Name of *this* service
	serviceName: getServiceName(),

	// Path to directory where JSON schemas are located relative to application root
	schemasPath: process.env.SCHEMAS_PATH || "/lib/schemas",

	// Generated id of service instance
	instanceId: getServiceName() + "." + uuid.v4().substring(0, 8),

	// Threshold for when fruster-bus will compress (gzip) data
	compressThreshold: parseInt(process.env.COMPRESS_THRESHOLD || 1024 * 900 + ""),

	// Chunks size, if compressed message data does not fit into one chunk (defined by this config)
	// it will be delivered in as many chunks needed to where each chunk has this size or less.
	chunkSize: parseInt(process.env.CHUNK_SIZE || 1024 * 900 + ""),

	// Timeout in ms for when chunks should have been delivered. If not all chunks
	// has been delivered within this time frame the delivery is considered to have failed.
	chunkTimeout: parseInt(process.env.CHUNK_TIMEOUT_MS || 1000 * 5 + ""),

	// How fruster-bus will handle compression of data
	// `manual` - compression will only be done if `dataEncoding` is set to a supported value (currently only `gzip` is supported)
	// `auto` - compression will happen automatically based on outgoing message size as configured in `COMPRESS_THRESHOLD`
	compressionStrategy: process.env.COMPRESSION_STRATEGY || constants.COMPRESSION_STRATEGY_AUTO,

	// If to disable that schemas are cached in memory when initialized multiple times
	// This would in most cases be kept as true to speed up testing.
	disableSchemaCache: process.env.DISABLE_SCHEMA_CACHE === "true",

	logLevel: (process.env.LOG_LEVEL || "info").toLowerCase(),
};

function getServiceName() {
	return process.env.SERVICE_NAME || process.env.DEIS_APP || "n/a";
}

if (conf.compressThreshold > conf.chunkSize) {
	// Chunking should only be used after data has been compressed
	throw new Error(
		`COMPRESS_THRESHOLD must be less than or equal CHUNK_SIZE, current values are ${conf.compressThreshold} and ${conf.chunkSize}`
	);
}

export default conf;
