import _ from "lodash";
import { Client } from "nats";
import * as uuid from "uuid";
import { FrusterRequest, ImmutableFrusterRequest } from "./model/FrusterRequest";
import { FrusterResponse } from "./model/FrusterResponse";
import * as schemas from "./schemas";
import subscribeCache from "./subscribe-cache";
import utils, { createRequestDataReplyToSubject, debugLog, ParsedSubject } from "./util/utils";
const errors = require("./util/errors");
import conf from "../conf";
import constants from "../constants";
import { publish as publishBuilder, PublishOptions } from "./publish";
import { FrusterDataMessage } from "./model/FrusterDataMessage";

const WILDCARD_REGEX = /\*/g;

let publish: (options: PublishOptions) => any;
let natsClient: Client;

export interface SubscribeOptions<ReqData = any> {
	/**
	 * subject to subscribe to, may contain params
	 * example: user-service.get.:userId
	 */
	subject: string;

	/**
	 * If queue group should be created, the queue group
	 * will be same as subject above
	 */
	createQueueGroup?: boolean;

	/**
	 * If user must be logged in to be able to request this
	 * subscription, only applicable for http requests
	 */
	mustBeLoggedIn?: boolean;

	/**
	 * Permission that user needs to have to be able to request
	 * this subscription, only applicable for http requests
	 */
	permissions?: string[] | string[][];

	/**
	 * Optional json schema that describes incoming requests
	 */
	requestSchema?: any;

	/**
	 * Optional json schema that describes the response this subscription emits
	 */
	responseSchema?: any;

	/**
	 * If bus should validate requests using provided `requestSchema`,
	 * default true
	 */
	validateRequest?: boolean;

	/**
	 * If bus should validate requests using provided `responseSchema`,
	 * default true
	 */
	validateResponse?: boolean;

	/**
	 * Function for handling subscription
	 */
	handle?: HandleFn<ReqData>;

	/**
	 * Documentation for endpoint. Used w/ automatic api documentation.
	 */
	docs?: {
		description?: string;
		query?: { [x: string]: string };
		params: { [x: string]: string };
		errors: { [x: string]: string };
	};

	/**
	 * Flag to mark if endpoint is deprecated. Will bubble up to auto generated API docs.
	 */
	deprecated?: boolean;
}

export const subscribe = (client: Client) => {
	natsClient = client;
	publish = publishBuilder(client);

	return (options: SubscribeOptions | string, cb?: HandleFn) => new Subscribe(options, cb);
};

const defaultOptions = {
	createQueueGroup: true,
	mustBeLoggedIn: false,
	validateRequest: true,
	validateResponse: true,
	docs: {
		description: "",
		query: {},
		params: {},
		errors: {},
	},
};

export type HandleFn<ReqData = any> = (
	jsonMsg: ImmutableFrusterRequest<ReqData>,
	replyTo: string,
	actualSubject: string
) => Promise<Partial<FrusterResponse>> | Partial<FrusterResponse> | void;

export class Subscribe {
	options: SubscribeOptions;

	handleFunction: HandleFn;

	private natsSubscribeOptions?: { queue: string };

	private parsedSubject?: ParsedSubject;

	private sid?: number;

	/**
	 * If this subscribe has a parent subscribe from which messages origins.
	 * Only set if internal routing is used.
	 */
	parentSubscribe?: Subscribe;

	/**
	 * If this subscribe should delegate matching messages to child subscribe.
	 * Only set if internal routing is used.
	 */
	private childSubscribes?: Subscribe[];

	constructor(options: SubscribeOptions | string, cb?: HandleFn) {
		this.options = this.parseSubscribeOptions(options, cb);

		if (this.options.createQueueGroup) {
			this.natsSubscribeOptions = { queue: this.options.subject.toLowerCase() };
		}

		if (!this.options.handle) {
			throw new Error("Missing handler function for subject " + this.options.subject);
		}

		this.handleFunction = this.options.handle;

		this.subscribe();

		debugLog(`Registered subscribe ${this.options.subject}`);

		if (this.options.createQueueGroup) this.configureInternalRouting();

		if (this.options.subject !== constants.METADATA_SUBJECT) subscribeCache.add(this);

		if (this.options.requestSchema && typeof this.options.requestSchema !== "string") {
			schemas.addSchema({ schema: this.options.requestSchema });
			this.options.requestSchema = this.options.requestSchema.$id;
		}

		if (this.options.responseSchema && typeof this.options.responseSchema !== "string") {
			schemas.addSchema({ schema: this.options.responseSchema });
			this.options.responseSchema = this.options.responseSchema.$id;
		}
	}

	/**
	 * Sets permissions using builder like syntax.
	 * @param permissions
	 * @returns
	 */
	permissions(permissions: string[]) {
		this.options.permissions = permissions;
		return this;
	}

	/**
	 * Sets that user must be logged in a.k.a. authenticated using builder like syntax.
	 * @returns
	 */
	mustBeLoggedIn() {
		this.options.mustBeLoggedIn = true;
		return this;
	}

	private parseSubscribeOptions(options: SubscribeOptions | string, cb?: HandleFn) {
		if (typeof options === "string") {
			if (!cb) throw new Error("Missing handler function for subscribe on subject: " + options);
			options = { subject: options, handle: cb };
		}

		options = { ...defaultOptions, ...options, handle: options.handle || cb };

		if (typeof options.subject !== "string") {
			const errorMessage = `bus.subscribe subject must be string but got ${typeof options.subject} with value ${
				options.subject
			}`;
			const missingSubjectError = new Error(errorMessage);
			console.error(errorMessage);
			throw missingSubjectError;
		}

		this.parsedSubject = utils.parseSubject(options.subject);

		return options;
	}

	/**
	 * Create NATS subscribe.
	 */
	private subscribe() {
		try {
			this.sid = natsClient.subscribe(
				this.getParsedSubject().subject,
				this.natsSubscribeOptions || {},
				(jsonMsg: any, replyTo: string, actualSubject: string) =>
					this.handleMessage(jsonMsg, replyTo, actualSubject)
			);
		} catch (err) {
			const errorMessage = `bus.subscribe subject must be string but got ${typeof this.getParsedSubject()
				.subject} with value ${this.getParsedSubject().subject}`;
			const missingSubjectError = new Error(errorMessage);
			console.error(missingSubjectError);
			throw missingSubjectError;
		}
	}

	/**
	 * Callback invoked when message is received from NATS subscribe or from
	 * a peer subscribe in case of internal routing.
	 *
	 * @param {Object} jsonMsg
	 * @param {String} replyTo
	 * @param {String} actualSubject
	 */
	private async handleMessage(jsonMsg: FrusterRequest, replyTo: string, actualSubject: string): Promise<any> {
		const startTime = Date.now();

		if (jsonMsg.chunks) {
			// Request is chunked, make sure to get those before proceeding
			jsonMsg.data = await this.getRequestDataChunks(jsonMsg, replyTo);
		}

		if (this.childSubscribes) {
			const childSub = this.getMatchingChildSubscribe(actualSubject);

			if (childSub) {
				return childSub.handleMessage(jsonMsg, replyTo, actualSubject);
			}
		}

		if (jsonMsg.dataEncoding) {
			try {
				jsonMsg.data = await this.decompress(jsonMsg);
			} catch (err) {
				console.log("Failed decompressing", err);
				this.handleError(err, jsonMsg, replyTo);
				return;
			}
		}

		if (!this.validateRequest(jsonMsg, replyTo)) {
			return;
		}

		utils.logIncomingMessage(this.options.subject, jsonMsg);

		const isAuthenticated = isAuthorizedForCall(
			this.options.permissions,
			this.options.mustBeLoggedIn,
			!!jsonMsg.user ? jsonMsg.user.scopes : []
		);

		if (!isAuthenticated) return publish({ subject: replyTo, message: this.notAuthorizedResponse() });

		const hasPermission = hasPermissionForCall(this.options.permissions, !!jsonMsg.user ? jsonMsg.user.scopes : []);

		if (hasPermission) {
			const params = utils.parseParams(this.options.subject, actualSubject);

			if (params) {
				if (jsonMsg.params) jsonMsg.params = Object.assign(params, jsonMsg.params);
				else jsonMsg.params = params;
			}

			let response: ReturnType<HandleFn>;

			try {
				jsonMsg.query = jsonMsg.query || {};
				jsonMsg.headers = jsonMsg.headers || {};
				jsonMsg.params = jsonMsg.params || {};

				response = this.handleFunction(jsonMsg as ImmutableFrusterRequest, replyTo, actualSubject);
			} catch (err) {
				this.handleError(err, jsonMsg, replyTo);
				return;
			}

			if (response && replyTo) {
				if (isPromise(response)) {
					(response as Promise<FrusterResponse>)
						.then((resolvedResponse: FrusterResponse) => {
							if (utils.isError(resolvedResponse)) {
								// TODO: Use handle error here instead?
								throw resolvedResponse;
							}

							resolvedResponse.reqId = jsonMsg.reqId;
							resolvedResponse.transactionId = jsonMsg.transactionId;
							resolvedResponse.ms = Date.now() - startTime;

							return this.publishResponse(resolvedResponse, replyTo, jsonMsg.dataSubject);
						})
						.catch((err: any) => this.handleError(err, jsonMsg, replyTo));
				} else {
					response = response as FrusterResponse;
					response.transactionId = jsonMsg.transactionId;
					response.reqId = jsonMsg.reqId;
					response.ms = Date.now() - startTime;

					await this.publishResponse(response as FrusterResponse, replyTo, jsonMsg.dataSubject);
				}
			}
		} else {
			publish({ subject: replyTo, message: this.forbiddenResponse() });
		}
	}

	private getMatchingChildSubscribe(incomingSubject: string) {
		return (this.childSubscribes || []).find((sub) => sub.options.subject === incomingSubject);
	}

	/**
	 * Subscribes on data subject to receive data chunks for request.
	 */
	private async getRequestDataChunks(chunkedRequest: FrusterRequest, replyTo: string) {
		if (!chunkedRequest.chunks) {
			console.warn("Cannot get data chunks as request is not chunked");
			return;
		}

		let chunks: string[] = new Array<string>(chunkedRequest.chunks).fill("");

		const dataSubject = createRequestDataReplyToSubject(
			this.getParsedSubject().subject,
			chunkedRequest.transactionId
		);

		// Publish to requester that remaining chunks can be published to dataSubject
		natsClient.publish(replyTo, { dataSubject, reqId: chunkedRequest.reqId, chunks: chunkedRequest.chunks });

		// Create a temporary subscribe to get all data chunks
		return new Promise<string>((resolve, reject) => {
			let timeout = setTimeout(() => {
				natsClient.unsubscribe(dataSubjectSid);
				reject("TIMEOUT");
			}, conf.chunkTimeout);

			const dataSubjectSid = natsClient.subscribe(
				dataSubject,
				(jsonMsg: { reqId: string; chunk: number; data: string }, replyTo: string) => {
					if (jsonMsg.chunk > chunkedRequest.chunks!) {
						throw new Error(`Invalid chunk ${jsonMsg.chunk}, expected ${chunkedRequest.chunks} chunks`);
					}
					chunks[jsonMsg.chunk] = jsonMsg.data;

					if (chunks.every((c) => !!c)) {
						clearTimeout(timeout);
						natsClient.unsubscribe(dataSubjectSid);
						resolve(chunks.join(""));
					}
				}
			);
		});
	}

	private async sendDataChunks(chunks: string[], reqId: string, transactionId: string, dataSubject: string) {
		let i = 0;
		for (const chunk of chunks) {
			const msg: FrusterDataMessage = {
				reqId,
				transactionId,
				data: chunk,
				chunk: i,
				chunks: chunks.length,
			};
			natsClient.publish(dataSubject, msg);
			i++;
		}
	}

	private notAuthorizedResponse() {
		const errorResp = errors.get("MUST_BE_LOGGED_IN");
		errorResp.thrower = conf.serviceName;
		return errorResp;
	}

	/**
	 * Creates forbidden response.
	 */
	private forbiddenResponse() {
		let permissionsText = "";

		if (
			this.options.permissions &&
			this.options.permissions.length > 0 &&
			Array.isArray(this.options.permissions[0])
		) {
			this.options.permissions.forEach((permissionSet, i) => {
				permissionsText += permissionSet;

				if (i < this.options.permissions!.length - 1) {
					permissionsText += " or ";
				}
			});
		} else if (typeof this.options.permissions === "string") {
			permissionsText = this.options.permissions;
		}

		const errorResp = errors.get("PERMISSION_DENIED", permissionsText);
		errorResp.thrower = conf.serviceName;

		return errorResp;
	}

	private validateRequest(req: FrusterRequest, replyTo: string) {
		if (!req.reqId) console.warn(`Message to subject "${this.parsedSubject?.subject}" is missing reqId`);

		if (this.options.requestSchema && this.options.validateRequest) {
			try {
				let schemaId = "";

				if (typeof this.options.requestSchema === "string") schemaId = this.options.requestSchema;
				else schemaId = this.options.requestSchema.$id;

				schemas.validate(schemaId, req.data);
			} catch (validationError) {
				this.handleError(validationError, req, replyTo);
				return false;
			}
		}
		return true;
	}

	/**
	 * @param {Object} response
	 * @param {String} replyTo
	 */
	private validateResponse(response: FrusterResponse, replyTo: string) {
		if (utils.isError(response)) {
			this.handleError(response, response, replyTo);
		} else if (this.options.responseSchema && this.options.validateResponse) {
			try {
				let schemaId = "";
				schemaId =
					typeof this.options.responseSchema === "string"
						? this.options.responseSchema
						: this.options.responseSchema.$id;

				schemas.validate(schemaId, response.data, false);
			} catch (validationError) {
				this.handleError(validationError, response, replyTo);
				return false;
			}
		}
		return true;
	}

	/**
	 * @param {Object} response
	 * @param {String} replyTo
	 */
	private async publishResponse(response: FrusterResponse, replyTo: string, dataSubject?: string) {
		const responseIsValid = this.validateResponse(response, replyTo);

		if (utils.shouldCompressMessage(response)) {
			response = await utils.compress(response);

			let chunks = utils.calcChunks(response.data);

			if (chunks.length && dataSubject) {
				// Set first chunk as data in request and then send next ones
				// when requesting service returns `dataSubject` in the reply to handler
				response.chunks = chunks.length;
				response.data = {};
				this.sendDataChunks(chunks, response.reqId!, response.transactionId!, dataSubject);
			}
		}

		if (responseIsValid) publish({ subject: replyTo, message: response });
	}

	/**
	 * @param {Object} err
	 * @param {FrusterRequest} req
	 * @param {String} replyTo
	 */
	private handleError(err: any, req: FrusterRequest | FrusterResponse, replyTo: string) {
		if (utils.isError(err)) {
			err.reqId = req.reqId;
			err.transactionId = req.transactionId;

			if (err.error && !err.error.id) err.error.id = uuid.v4();

			if (err.error && !err.error.thrower) err.error.thrower = conf.serviceName;

			publish({ subject: replyTo, message: err });
		} else {
			console.error(err.stack);
			publish({
				subject: replyTo,
				message: { ...errors.internalServerError(err.stack || err), reqId: req.reqId },
			});
		}
	}

	/**
	 * Decompresses data object of request.
	 */
	private async decompress(req: FrusterRequest) {
		if (req.dataEncoding === constants.CONTENT_ENCODING_GZIP) {
			console.log("Decompressing");
			return utils.decompress(req.data);
		} else {
			throw errors.get("INVALID_DATA_ENCODING", req.dataEncoding);
		}
	}

	/**
	 * Makes this subscribe routable via an catch-all subscribe instead of
	 * exposing a subscribe to NATS directly.
	 */
	setParentSubscribe(parentSubscribe: Subscribe) {
		if (this.sid) natsClient.unsubscribe(this.sid);

		this.childSubscribes = undefined;
		this.parentSubscribe = parentSubscribe;
	}

	setChildSubscribes(childSubs: Subscribe[]) {
		this.parentSubscribe = undefined;
		this.childSubscribes = childSubs;
		this.childSubscribes.forEach((sub) => sub.setParentSubscribe(this));
	}

	/**
	 * Configures internal routing for subscribe.
	 *
	 * Will check if this subscribe overlaps with any existing subscribes by inspecting
	 * parsed NATS subject. For example `http.get.foo` and `http.get.:id` would overlap.
	 *
	 * In case an overlap exists internal routing will be configured so parent subscribe acts
	 * as "catch all" and then dispatches to any internal route in case of subject match.
	 */
	private configureInternalRouting() {
		const thisSubject = this.parsedSubject!.subject;

		const overlaps = subscribeCache.subscribes.filter((sub) => {
			const oSubject = sub.parentSubscribe
				? sub.parentSubscribe.parsedSubject!.subject
				: sub.parsedSubject!.subject;
			return utils.matchSubject(thisSubject, oSubject) || utils.matchSubject(oSubject, thisSubject);
		});

		if (overlaps.length) {
			const allSubs = [...overlaps, this];

			// Find best candidate for "catch-all" by finding the one with most wildcards.
			const catchAllSub = allSubs.reduce((prev, curr) => {
				if (!prev) {
					return curr;
				}
				const prevWildcards = (prev.parsedSubject!.subject.match(WILDCARD_REGEX) || []).length;
				const currWildcards = (curr.parsedSubject!.subject.match(WILDCARD_REGEX) || []).length;
				return prevWildcards > currWildcards ? prev : curr;
			});

			// Activate internal routing on catch-all by adding child subscribes to it
			catchAllSub.setChildSubscribes(allSubs.filter((sub) => sub !== catchAllSub));
		}
	}

	private getParsedSubject() {
		if (!this.parsedSubject) {
			throw new Error("Subscribe subject has not been parsed (should not happen");
		}
		return this.parsedSubject;
	}
}

/**
 * Checks permissions.
 * Matches the subscribes permissions with users scopes.
 */
function hasPermissionForCall(inputPermissions: undefined | string[] | string[][], userScopes: string[] = []) {
	let hasAnySetOfPermissions = false;
	const permissionSets: string[][] =
		inputPermissions && inputPermissions.length > 0
			? Array.isArray(inputPermissions[0])
				? (inputPermissions as string[][])
				: [inputPermissions as string[]]
			: [];

	/**
	 * If no permission specified or user scope has wild card for both service and action we return true.
	 */
	if (!permissionSets || permissionSets.length === 0 || userScopes.includes("*")) {
		return true;
	} else {
		permissionSets.forEach((permissions, i) => {
			const permissionsObj = convertPermissionsToObject(permissions);
			const userScopesObj = convertPermissionsToObject(userScopes);
			let isAuthed = true;

			_.forIn(permissionsObj, (actions, entity) => {
				_.forIn(actions, (b, action) => {
					if (!userScopesObj[entity]) {
						isAuthed = false;
						return false;
					}

					isAuthed =
						isAuthed &&
						(userScopeHasPermissionForAction(userScopesObj, entity, action) ||
							userScopeHasWildcardForAction(userScopesObj, entity) ||
							serviceHasWildcardForPermissionInUserScope(permissionsObj, userScopesObj, entity));
				});
			});

			hasAnySetOfPermissions = hasAnySetOfPermissions || isAuthed;
		});
	}

	/**
	 * Converts list of permissions to Object<entity: String, Object<permission: String, hasPermission: Boolean>>
	 *
	 * @param {Array<String>} permissions
	 */
	function convertPermissionsToObject(permissions: string[]) {
		var obj: { [x: string]: { [y: string]: boolean } } = {};

		permissions.forEach((permission) => {
			var entity = permission.substring(0, permission.lastIndexOf(".")),
				currentPermission = permission.substring(permission.lastIndexOf(".") + 1);

			if (!obj[entity]) {
				obj[entity] = {};
			}

			obj[entity][currentPermission] = true;
		});

		return obj;
	}

	/**
	 * Checks if user has permission for specific action.
	 *
	 * @param {String} key
	 * @param {String} permission
	 */
	function userScopeHasPermissionForAction(
		userScopesObj: any /* TODO: Type this */,
		key: string,
		permission: string
	) {
		return !!userScopesObj[key][permission];
	}

	/**
	 * Checks if user's scopes has a wildcard for specific action.
	 *
	 * @param {String} key
	 */
	function userScopeHasWildcardForAction(userScopesObj: any /* TODO: Type this */, key: string) {
		return !!userScopesObj[key]["*"];
	}

	/**
	 * Checks if subscribe's permission has a wildcard for specific action.
	 *
	 * @param {String} key
	 */
	function serviceHasWildcardForPermissionInUserScope(permissionsObj: any, userScopesObj: any, key: string) {
		return !!permissionsObj[key]["*"] && _.size(userScopesObj[key]) > 0;
	}

	return hasAnySetOfPermissions;
}

/**
 * Checks if user is authorized for call
 */
function isAuthorizedForCall(
	requiredPermissions: undefined | string[] | string[][],
	mustBeLoggedIn: boolean | undefined,
	userScopes: string[] = []
) {
	const permissionSets =
		requiredPermissions && requiredPermissions.length > 0
			? requiredPermissions[0] instanceof Array
				? requiredPermissions
				: [requiredPermissions]
			: [];

	// user is logged in
	if (userScopes.length > 0) return true;

	// call doesn't require authorization
	if (!mustBeLoggedIn && permissionSets.length === 0) return true;

	return false;
}

function isPromise(o: any) {
	return _.isFunction(o.then);
}
