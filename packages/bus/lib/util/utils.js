const _ = require("lodash");
const log = require("fruster-log");
const conf = require("../../conf");
const constants = require("../../constants").default;
const zlib = require("zlib");

const ESCAPED_DOTS_STRING = "{dot}";
const BASE_64 = "base64";

const utils = {
	/**
	 * @param {Object} msg
	 */
	toString: (msg) => {
		return JSON.stringify(msg);
	},

	/**
	 * @param {Object} msg
	 */
	normalizeJSON: (msg) => {
		return JSON.parse(JSON.stringify(msg));
	},

	/**
	 * @param {Object} msg
	 */
	isError: (msg) => {
		return msg.status >= 400 || !_.isEmpty(msg.error);
	},

	/**
	 * @param {String} subject
	 * @param {Object} msg
	 */
	logIncomingMessage: (subject, msg = {}) => {
		if (log.transports.console.level === conf.busLogLevel) {
			log[conf.busLogLevel](`[SUB] [${msg.transactionId}] [${subject}] ${JSON.stringify(msg)}`);
		}
	},

	/**
	 * @param {String} subject
	 * @param {Object} msg
	 */
	logOutgoingMessage: (subject, msg = {}) => {
		if (log.transports.console.level == conf.busLogLevel) {
			log[conf.busLogLevel](`[PUB] [${msg.transactionId}] [${subject}] ${JSON.stringify(msg)}`);
		}
	},

	/**
	 * Transforms fruster-specific param-url to NATS url and picks out param names.
	 * Also adds meta data about http and http method.
	 *
	 * @param {String} subject
	 */
	parseSubject: (subject) => {
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
	parseParams: (subject, actualSubject) => {
		const paramValues = {};
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
	setFromMetadata: (msg) => {
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
	compress: (msg) => {
		return new Promise((resolve, reject) => {
			zlib.deflate(JSON.stringify(msg.data), (err, deflatedData) => {
				if (err) {
					return reject(err);
				}

				msg.data = deflatedData.toString(BASE_64);
				msg.dataEncoding = constants.CONTENT_ENCODING_GZIP;

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
	decompress: (compressedData) => {
		return new Promise((resolve, reject) => {
			const buffer = new Buffer(compressedData, BASE_64);

			zlib.inflate(buffer, (err, res) => {
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
	shouldCompressMessage: (msg) => {
		return (
			msg.dataEncoding === constants.CONTENT_ENCODING_GZIP ||
			(conf.compressionStrategy === constants.COMPRESSION_STRATEGY_AUTO &&
				msg.data &&
				utils.toString(msg.data).length > conf.compressTreshold)
		);
	},

	/**
	 * Matches subject with NATS pattern (https://nats.io/documentation/writing_applications/subjects/).
	 *
	 * @param {String} subject
	 * @param {String} pattern
	 */
	matchSubject: (subject, pattern) => {
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

			match = subjectSplit[i] === patternSplit[i] || (patternSplit[i] === "*" && subjectSplit[i]);
			i++;
		}

		return match;
	},
};

module.exports = utils;
