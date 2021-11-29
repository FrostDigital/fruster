import { Client } from "nats";
import uuid from "uuid";
import conf from "../conf";
import constants from "../constants";
import { FrusterResponse } from "./model/FrusterResponse";
import { FrusterRequest } from "./model/FrusterRequest";
import errors from "./util/errors";
import utils from "./util/utils";

// TODO: Is this needed? Move to other place?
export interface RequestMessage {
	reqId: string;
	data?: any;
	transactionId?: string;
}

export interface TestRequestMessage extends Omit<RequestMessage, "reqId"> {
	reqId?: string;
	query?: { [x: string]: string };
	params?: { [x: string]: string };
	headers?: { [x: string]: string };
	user?: Partial<FrusterRequest["user"]>;
}

export interface RequestOptions {
	subject: string;
	message: RequestMessage;
	timeout?: number;
}

export interface RequestManyOptions extends RequestOptions {
	maxResponses?: number;
}

export interface TestRequestOptions extends Omit<RequestOptions, "message"> {
	message: TestRequestMessage;
}

let natsClient: Client;

export const request = (client: Client) => {
	natsClient = client;

	return {
		request: async (options: RequestOptions) => {
			const res = await doRequest(options);

			if (Array.isArray(res)) {
				throw new Error(
					"Request returned multiple response, use requestMany to send request with many responses"
				);
			}

			return res as FrusterResponse;
		},
		requestMany: async (options: RequestManyOptions) => {
			if (!options.maxResponses) options.maxResponses = 10;
			const responses = await doRequest(options);
			return Array.isArray(responses) ? responses : [responses];
		},
	};
};

/**
 * Send requests on bus and resolves the response.
 * Returns error if message is erroneous (as defined in Fruster
 * message model) or if it times out.
 *
 * Will send options request over bus to decided which protocol
 * to use.
 *
 * {String} subject
 * {Object} json message to send
 * {Integer} optional timeout in ms
 *  {boolean} if options response should be returned directly
 *
 * @return {Promise<FrusterResponse>} promise that resolves the response
 */
function doRequest(reqOptions: RequestOptions) {
	return busRequest(reqOptions);
}

function busRequest(reqOptions: RequestOptions & RequestManyOptions): Promise<FrusterResponse | FrusterResponse[]> {
	return new Promise(async (resolve, reject) => {
		reqOptions.message.transactionId = uuid.v4();

		utils.logOutgoingMessage(reqOptions.subject, reqOptions.message);

		const replyTo = createReplyToSubject(reqOptions.subject, reqOptions.message.transactionId);

		utils.setFromMetadata(reqOptions.message);

		const responses: FrusterResponse[] = [];

		const sid = natsClient.subscribe(replyTo, {}, async (jsonResp: FrusterResponse) => {
			if (jsonResp.dataEncoding) {
				if (jsonResp.dataEncoding === constants.CONTENT_ENCODING_GZIP) {
					jsonResp.data = await utils.decompress(jsonResp.data);
				} else {
					// TODO: Fix this
					// @ts-ignore
					const error: FrusterResponse = errors.get("INVALID_DATA_ENCODING", jsonResp.dataEncoding);
					error.reqId = reqOptions.message.reqId;
					error.transactionId = reqOptions.message.reqId;

					addToStringFunctionAndReject(error, reject);
				}
			}

			utils.logIncomingMessage(reqOptions.subject, jsonResp);

			jsonResp.reqId = reqOptions.message.reqId;

			if (reqOptions.maxResponses && reqOptions.maxResponses > 1) {
				// Request are expecting multiple responses, stash this response
				// in array and, if max responses has been reached, resolve those

				responses.push(jsonResp);

				if (responses.length >= reqOptions.maxResponses) {
					resolve(responses);
					natsClient.unsubscribe(sid);
				}
			} else {
				if (utils.isError(jsonResp)) {
					addToStringFunctionAndReject(jsonResp, reject);
				} else {
					resolve(jsonResp);
				}

				natsClient.unsubscribe(sid);
			}
		});

		if (reqOptions.timeout || (reqOptions?.maxResponses && reqOptions.maxResponses > 1)) {
			natsClient.timeout(sid, reqOptions.timeout || 200, reqOptions.maxResponses || 1, () => {
				natsClient.unsubscribe(sid);

				if (reqOptions.maxResponses && reqOptions.maxResponses > 1) {
					// Response subscription timed out, but since we are expecting multiple
					// responses, just resolve those present at this point

					resolve(responses);
				} else {
					// TODO: Fix this
					// @ts-ignore
					const errorResp: FrusterResponse = errors.get(
						"BUS_RESPONSE_TIMEOUT",
						reqOptions.subject,
						reqOptions.timeout
					);
					errorResp.reqId = reqOptions.message.reqId;
					errorResp.transactionId = reqOptions.message.transactionId!;
					errorResp.thrower = conf.serviceName;

					addToStringFunctionAndReject(errorResp, reject);
				}
			});
		}

		if (utils.shouldCompressMessage(reqOptions.message)) {
			// TODO
			// @ts-ignore
			reqOptions.message = await utils.compress(reqOptions.message);
		}

		natsClient.publish(reqOptions.subject, reqOptions.message, replyTo);
	});
}

function createReplyToSubject(subject: string, transactionId: string) {
	return `res.${transactionId}.${subject}`;
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
