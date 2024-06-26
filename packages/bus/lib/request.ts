import { Client } from "nats";
import * as uuid from "uuid";
import conf from "../conf";
import constants from "../constants";
import { reqId } from "./async-context";
import { FrusterDataMessage } from "./model/FrusterDataMessage";
import { RequestManyOptions, RequestOptions } from "./model/FrusterRequest";
import { FrusterErrorResponse, FrusterResponse, ImmutableFrusterResponse } from "./model/FrusterResponse";
import errors from "./util/errors";
import utils, { createResponseDataReplyToSubject, createResponseReplyToSubject } from "./util/utils";

let natsClient: Client;

/**
 * Timeout for unsubscribing from data subject. This is used as cleanup in case
 * response is not received and data subject is not unsubscribed.
 */
const UNSUBSCRIBE_DATA_TIMEOUT = 5 * 1000;

export const request = (client: Client) => {
	natsClient = client;

	return {
		request: async <ReqData = any, ResData = any>(options: RequestOptions<ReqData>) => {
			options.throwErrors = options.throwErrors === undefined ? true : options.throwErrors;
			const res = await busRequest(options);

			if (Array.isArray(res)) {
				throw new Error(
					"Request returned multiple response, use requestMany to send request with many responses"
				);
			}

			return res as ImmutableFrusterResponse<ResData>;
		},
		requestMany: async <ReqData = any, ResData = any>(options: RequestManyOptions<ReqData>) => {
			if (!options.maxResponses) options.maxResponses = 10;
			options.throwErrors = options.throwErrors === undefined ? true : options.throwErrors;
			const responses = await busRequest(options);
			return (Array.isArray(responses) ? responses : [responses]) as ImmutableFrusterResponse<ResData>[];
		},
	};
};

/**
 * Send requests on bus and resolves the response.
 * Returns error if message is erroneous (as defined in Fruster
 * message model) or if it times out.
 *
 * @return {Promise<FrusterResponse>} promise that resolves the response
 */
function busRequest(reqOptions: RequestOptions & RequestManyOptions): Promise<FrusterResponse | FrusterResponse[]> {
	return new Promise(async (resolve, reject) => {
		reqOptions.message.transactionId = uuid.v4();

		// a) If explicitly set reqId - use that one
		// b) Get from async context
		// c) Generate new one
		reqOptions.message.reqId = reqOptions.message.reqId || reqId() || uuid.v4();

		utils.logOutgoingMessage(reqOptions.subject, reqOptions.message);

		// Subject that requested service will send the response to
		const replyTo = createResponseReplyToSubject(reqOptions.subject, reqOptions.message.transactionId);
		// Subject that requested service will send data chunks to, if needed
		const replyToData = createResponseDataReplyToSubject(reqOptions.subject, reqOptions.message.transactionId);

		utils.setFromMetadata(reqOptions.message);

		const responses: FrusterResponse[] = [];

		let reqChunks: string[] = [];
		let resChunks: string[] = [];
		let res: FrusterResponse;

		// Subscribe on data subject
		const dataSid = natsClient.subscribe(replyToData, {}, async (dataMsg: FrusterDataMessage) => {
			if (resChunks.length === 0) {
				resChunks = new Array(dataMsg.chunks).fill("");
			}

			resChunks[dataMsg.chunk] = dataMsg.data;

			if (resChunks.every((c) => !!c)) {
				// All chunks are in place 🎉
				natsClient.unsubscribe(dataSid);

				if (res) {
					// Response has been retrieved, proceed to process the response now that data is here
					processResponse();
				} else {
					// Response it not here yet, do nothing and wait for other callback to be invoked
					// and further process is
				}
			}
		});

		const sid = natsClient.subscribe(replyTo, {}, async (jsonResp: FrusterResponse) => {
			if (jsonResp.dataSubject && jsonResp.chunks) {
				// Responder want requester data to be chunked to provided `dataSubject`
				let i = 0;
				for (const chunk of reqChunks) {
					natsClient.publish(jsonResp.dataSubject, { reqId: jsonResp.reqId, data: chunk, chunk: i });
					i++;
				}
				return;
			}

			res = jsonResp;

			if (!jsonResp.chunks || resChunks.every((c) => !!c)) {
				processResponse();
			}
		});

		// Cleanup data subscription after timeout, note that it might already have been
		// unsubscribed if all chunks have been received or if non data response has been received
		setTimeout(() => {
			try {
				natsClient.unsubscribe(dataSid);
			} catch (e) {}
		}, UNSUBSCRIBE_DATA_TIMEOUT);

		async function processResponse() {
			if (res.dataEncoding) {
				if (res.dataEncoding === constants.CONTENT_ENCODING_GZIP) {
					res.data = await utils.decompress(resChunks.length > 0 ? resChunks.join("") : res.data);
				} else {
					const error = errors.get("INVALID_DATA_ENCODING", res.dataEncoding);

					const apiError: FrusterErrorResponse = {
						...error,
						reqId: reqOptions.message.reqId, // TODO: From async local storage?
						transactionId: reqOptions.message.reqId,
					};

					if (reqOptions.throwErrors) {
						addToStringFunctionAndReject(apiError, reject);
					} else {
						resolve(apiError);
					}
				}
			}

			utils.logIncomingMessage(reqOptions.subject, res);

			res.reqId = reqOptions.message.reqId;

			if (reqOptions.maxResponses && reqOptions.maxResponses > 1) {
				// Request are expecting multiple responses, stash this response
				// in array and, if max responses has been reached, resolve those

				responses.push(res);

				if (responses.length >= reqOptions.maxResponses) {
					resolve(responses);
					natsClient.unsubscribe(sid);
					natsClient.unsubscribe(dataSid);
				}
			} else {
				if (utils.isError(res)) {
					if (reqOptions.throwErrors) {
						addToStringFunctionAndReject(res, reject);
					} else {
						resolve(res);
					}
				} else {
					resolve(res);
				}

				natsClient.unsubscribe(sid);
				natsClient.unsubscribe(dataSid);
			}
		}

		if (reqOptions.timeout || (reqOptions?.maxResponses && reqOptions.maxResponses > 1)) {
			natsClient.timeout(sid, reqOptions.timeout || 200, reqOptions.maxResponses || 1, () => {
				natsClient.unsubscribe(sid);

				if (reqOptions.maxResponses && reqOptions.maxResponses > 1) {
					// Response subscription timed out, but since we are expecting multiple
					// responses, just resolve those present at this point

					resolve(responses);
				} else {
					const errorResp: FrusterErrorResponse = errors.get(
						"BUS_RESPONSE_TIMEOUT",
						reqOptions.subject,
						reqOptions.timeout
					);
					errorResp.reqId = reqOptions.message.reqId;
					errorResp.transactionId = reqOptions.message.transactionId!;
					errorResp.thrower = conf.serviceName;

					if (reqOptions.throwErrors) {
						addToStringFunctionAndReject(errorResp, reject);
					} else {
						resolve(errorResp);
					}
				}
			});
		}

		if (utils.shouldCompressMessage(reqOptions.message)) {
			reqOptions.message = await utils.compress(reqOptions.message);
		}

		if (reqOptions.message.dataEncoding === "gzip") {
			// Note: Chunking is only available after compression has been done
			reqChunks = utils.calcChunks(reqOptions.message.data);

			if (reqChunks.length) {
				// Set first chunk as data in request and then send next ones
				// when requesting service returns `dataSubject` in the reply to handler
				reqOptions.message.chunks = reqChunks.length;
				reqOptions.message.data = {};
			}
		}

		reqOptions.message.dataSubject = replyToData;

		natsClient.publish(reqOptions.subject, reqOptions.message, replyTo);
	});
}

/**
 * Adds a toString method before rejecting to make logs better.
 *
 * This is somewhat a hack, I guess.
 * @param {Object} err
 * @param {Function} reject
 */
function addToStringFunctionAndReject(err: any, reject: Function) {
	if (err && typeof err === "object") {
		err.toString = () => {
			try {
				return JSON.stringify(err);
			} catch (stringifyError) {
				return err;
			}
		};
	}

	reject(err);
}
