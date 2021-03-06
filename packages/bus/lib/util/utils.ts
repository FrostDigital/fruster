import _ from "lodash";
import conf from "../../conf";
import constants from "../../constants";
import { CreateFrusterRequest } from "../model/FrusterRequest";
import { FrusterResponse } from "../model/FrusterResponse";
import crypto from "crypto";

const zlib = require("zlib");

const ESCAPED_DOTS_STRING = "{dot}";
const BASE_64 = "base64";

const SILLY_LOG_LEVEL = "silly";

export interface ParsedSubject {
	subject: string;
	isHTTP: boolean;
	httpMethod?: string;
}

const utils = {
	toString: (msg: any) => {
		return JSON.stringify(msg);
	},

	normalizeJSON: (msg: any) => {
		return JSON.parse(JSON.stringify(msg));
	},

	isError: (msg: object & { status?: number; error?: any }) => {
		return (msg.status && msg.status >= 400) || !_.isEmpty(msg.error);
	},

	logIncomingMessage: (subject: string, msg: any) => {
		if (conf.logLevel === SILLY_LOG_LEVEL) {
			console.log(`[SUB] [${msg.transactionId}] [${subject}] ${JSON.stringify(msg)}`);
		}
	},

	logOutgoingMessage: (subject: string, msg: any) => {
		if (conf.logLevel === SILLY_LOG_LEVEL) {
			console.log(`[PUB] [${msg.transactionId}] [${subject}] ${JSON.stringify(msg)}`);
		}
	},

	/**
	 * Transforms fruster-specific param-url to NATS url and picks out param names.
	 * Also adds meta data about http and http method.
	 *
	 * @param {String} subject
	 */
	parseSubject: (subject: string): ParsedSubject => {
		const subjectSplit = subject.split(".");
		const isHTTP = subject.indexOf("http.") == 0;

		let outSubject = "";
		subjectSplit.forEach((step, index) => {
			if (step.includes(":")) {
				outSubject += "*";
			} else {
				outSubject += step;
			}

			if (index !== subjectSplit.length - 1) {
				outSubject += ".";
			}
		});

		return {
			subject: outSubject,
			isHTTP: isHTTP,
			httpMethod: isHTTP ? subjectSplit[1].toUpperCase() : undefined,
		};
	},

	/**
	 * Parses parameters from request.
	 *
	 * @param {String} subject subject subscribed to
	 * @param {String} actualSubject the subject the request was sent to w/ any wildcards replaced by its values
	 *
	 * @return {Object<String, String>} params object
	 */
	parseParams: (subject: string, actualSubject: string) => {
		const paramValues: any = {};
		const subjectParts = subject.split(".");

		const actualSubjectParts = actualSubject.split(".");

		subjectParts.forEach((part, i) => {
			if (part.includes(":")) {
				paramValues[part.replace(":", "")] = actualSubjectParts[i].split(ESCAPED_DOTS_STRING).join(".");
			}
		});

		if (_.size(paramValues) > 0) {
			return paramValues;
		} else {
			return undefined;
		}
	},

	/**
	 * Sets "from" metadata to provided bus message.
	 *
	 * @param {Object} msg (req or response)
	 *
	 * @return {Object} message with "from" set
	 */
	setFromMetadata: (msg: any) => {
		msg.from = {
			service: conf.serviceName,
			instanceId: conf.instanceId,
		};

		return msg;
	},

	/**
	 * Compresses data of json message to a base64 encoded gzip string.
	 * Will set `dataEncoding` property.
	 *
	 * @param {Object} msg (req or response)
	 * @returns {Promise<Object>} message with compressed data
	 */
	compress: (msg: CreateFrusterRequest | FrusterResponse) => {
		return new Promise<any & { data: string; dataEncoding: string }>((resolve, reject) => {
			zlib.deflate(JSON.stringify(msg.data), (err: any, deflatedData: any) => {
				if (err) {
					return reject(err);
				}

				msg.data = deflatedData.toString(BASE_64);
				msg.dataEncoding = "gzip";

				resolve(msg);
			});
		});
	},

	/**
	 * decompresses base64 encoded gzip string into
	 * a json object.
	 *
	 * @param {String} compressedData to be inflated
	 */
	decompress: (compressedData: string) => {
		return new Promise((resolve, reject) => {
			const buffer = Buffer.from(compressedData, BASE_64);

			zlib.inflate(buffer, (err: any, res: any) => {
				if (err) {
					return reject(err);
				}
				resolve(JSON.parse(res.toString()));
			});
		});
	},

	/**
	 * Check if message needs to be compressed based if data encoding is set, compression
	 * strategy and/or message size.
	 *
	 * @param {Object} msg
	 * @returns {Boolean} true is message data should be compressed
	 */
	shouldCompressMessage: (msg: CreateFrusterRequest | FrusterResponse) => {
		return (
			msg.dataEncoding === constants.CONTENT_ENCODING_GZIP ||
			(conf.compressionStrategy === constants.COMPRESSION_STRATEGY_AUTO &&
				msg.data &&
				utils.toString(msg.data).length > conf.compressThreshold)
		);
	},

	calcChunks: (data: string, chunkSize = conf.chunkSize) => {
		const length = data.length;

		if (length <= chunkSize) {
			return [];
		}

		const numChunks = Math.ceil(length / chunkSize);

		let chunks: string[] = [];

		for (let i = 0; i < numChunks; i++) {
			chunks[i] = data.substring(i * chunkSize, Math.min(i * chunkSize + chunkSize, length));
		}

		return chunks;
	},

	/**
	 * Matches subject with NATS pattern (https://nats.io/documentation/writing_applications/subjects/).
	 *
	 * @param {String} subject
	 * @param {String} pattern
	 */
	matchSubject: (subject: string, pattern: string) => {
		if (subject === pattern || pattern === ">") {
			return true;
		}

		const subjectSplit = subject.split(".");
		const patternSplit = pattern.split(".");

		let match = true;
		const mostDetailedSplit = subjectSplit.length >= patternSplit.length ? subjectSplit : patternSplit;
		let i = 0;

		while (match && i < mostDetailedSplit.length) {
			if (subjectSplit[i] && patternSplit[i] === ">") {
				match = true;
				break;
			}

			match = subjectSplit[i] === patternSplit[i] || (patternSplit[i] === "*" && !!subjectSplit[i]);
			i++;
		}

		return match;
	},
};

export default utils;

/**
 * Constructs a reply-to subject that response from requesting service will reply to.
 *
 * @param subject
 * @param transactionId
 * @returns
 */
export function createResponseReplyToSubject(subject: string, transactionId: string) {
	return `res.${transactionId}.${subject}`;
}

/**
 * Constructs a reply-to subject for data messages in case chunking is used.
 *
 * @param subject
 * @param transactionId
 * @returns
 */
export function createResponseDataReplyToSubject(subject: string, transactionId: string) {
	return `_data_.res.${transactionId}.${subject}`;
}

/**
 * Constructs a reply-to subject for data messages in case chunking is used.
 *
 * @param subject
 * @param transactionId
 * @returns
 */
export function createRequestDataReplyToSubject(subject: string, transactionId: string) {
	return `_data_.${transactionId}.${subject}`;
}

export function debugLog(msg: string) {
	if (process.env.DEBUG_FRUSTER_BUS) {
		console.log("[FRUSTER BUS]", msg);
	}
}

export function hashSchema(object: any) {
	return crypto
		.createHash("md5")
		.update(JSON.stringify(object || {}))
		.digest("hex");
}
