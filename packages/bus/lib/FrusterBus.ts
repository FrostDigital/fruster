import nats from "nats";
import uuid from "uuid";
import conf from "../conf";
import constants from "../constants";
import MetadataHandler from "./MetadataHandler";
import { ConnectedClient, ConnectOptions } from "./model/ConnectedClient";
import { FrusterRequest } from "./model/FrusterRequest";
import { FrusterResponse } from "./model/FrusterResponse";
import { publish as publishBuilder, PublishOptions } from "./publish";
import { request as requestBuilder, RequestManyOptions, RequestOptions, TestRequestOptions } from "./request";
import * as schemas from "./schemas";
import { HandleFn, Subscribe, subscribe as subscribeBuilder, SubscribeOptions } from "./subscribe";
import subscribeCache from "./subscribe-cache";

class FrusterBus {
	private connectedClients: ConnectedClient[] = [];

	/**
	 * Bus with typings more suitable for writing tests/specs.
	 */
	testBus: TestBus = new TestBus(this);

	/**
	 * Connect fruster bus to nats
	 *
	 * @example bus.connect("nats://localhost:4222");
	 *
	 * @param {ConnectOptions|Array<String>|String} inputOptions the address(es) to the nats bus
	 * @param {String=} schemaDir connect options or directory where json schemas are located.
	 *
	 * @return {Promise<Client>}
	 */
	async connect(inputOptions: ConnectOptions | string | string[]) {
		const options = this.parseConnectOptions(inputOptions);

		if (this.connectedClients.length > 0) {
			const masterClient = this.connectedClients.find((client) => !!client.busOptions?.singleton);

			if (masterClient) return masterClient;
		}

		schemas.init(options.schemasDir!, options.schemaResolver);

		subscribeCache.clear();

		const client = await this.doConnect(options);

		this.connectedClients.push(client);

		this.subscribe = subscribeBuilder(client);

		this.publish = publishBuilder(client);

		const { request, requestMany } = requestBuilder(client);
		this.request = request;
		this.requestMany = requestMany;

		const metadataHandler = new MetadataHandler();

		this.subscribe(
			{
				subject: constants.METADATA_SUBJECT,
				createQueueGroup: false,
			},
			(req: FrusterRequest) => metadataHandler.handle(req)
		);

		return client;
	}

	subscribe<ReqData = any>(options: SubscribeOptions<ReqData> | string, cb?: HandleFn<ReqData>): Subscribe {
		// Note: Method is set when client is connected
		throw new Error("There are no connected client(s)");
	}

	request<ReqData = any, ResData = any>(options: RequestOptions<ReqData>): Promise<FrusterResponse<ResData>> {
		// Note: Method is set when client is connected
		throw new Error("There are no connected client(s)");
	}

	requestMany(options: RequestManyOptions): Promise<FrusterResponse[]> {
		// Note: Method is set when client is connected
		throw new Error("There are no connected client(s)");
	}

	publish(options: PublishOptions) {
		// Note: Method is set when client is connected
		throw new Error("There are no connected client(s)");
	}

	close(client: ConnectedClient) {
		// if (client.isConnected) {
		client.close();
		// Note: Seems like "close" event is not emitted by nats so need to update
		// isConnected here as well
		client.isConnected = false;
		client.isReconnecting = false;
		client.isClosed = true;
		// }
	}

	closeAll() {
		this.connectedClients.forEach((client) => this.close(client));
	}

	getConnectedClients() {
		return this.connectedClients;
	}

	clearClients() {
		this.connectedClients = [];
	}

	/**
	 * Whether or not the bus has any connected client.
	 */
	get connected() {
		if (this.connectedClients.length > 0) {
			return !!this.connectedClients.find((client) => client.isConnected);
		} else {
			return false;
		}
	}

	/**
	 * Whether or not the bus is closed completely.
	 */
	get closed() {
		if (this.connectedClients.length > 0)
			return this.connectedClients.filter((client) => client.isClosed).length === this.connectedClients.length;
		else return false;
	}

	/**
	 * Whether or not the bus has any reconnecting client.
	 */
	get reconnecting() {
		if (this.connectedClients.length > 0) return !!this.connectedClients.find((client) => client.isReconnecting);
		else return false;
	}

	private parseConnectOptions(options: ConnectOptions | string | string[]) {
		let parsedOptions: ConnectOptions;

		if (typeof options === "string" || Array.isArray(options)) {
			parsedOptions = {
				address: options,
			};
		} else {
			parsedOptions = { ...options };
		}

		if (!parsedOptions.schemasDir) {
			parsedOptions.schemasDir = conf.schemasPath;
		}

		return parsedOptions;
	}

	/**
	 * Connects to NATS bus.
	 *
	 * Will connect to mocked, in-memory NATS if url is set to `nats://mock`
	 */
	private async doConnect(options: ConnectOptions): Promise<ConnectedClient> {
		return new Promise((resolve, reject) => {
			let client: ConnectedClient;

			if (!options.address) {
				throw new Error(`bus.connect(...) failed: Invalid bus address, expected string or array of strings`);
			}

			if (
				options.address === "nats://mock" ||
				options.address === "mock" ||
				options.address.includes("nats://mock") ||
				options.address.includes("mock")
			) {
				const mockNatsClient = require("mock-nats-client");
				client = mockNatsClient.connect({ json: true });
				client.busOptions = options;
				console.log("Connecting to mocked NATS bus");
			} else {
				client = nats.connect({
					servers: Array.isArray(options.address) ? options.address : [options.address],
					json: true,
				});
				client.busOptions = options;
				console.log("Connecting to NATS bus", options.address);
			}

			client.on("connect", () => {
				client.isConnected = true;
				console.log("Successfully connected to NATS bus", options.address);
				resolve(client);
			});

			client.on("reconnecting", () => {
				client.isReconnecting = true;
				client.isConnected = false;
				console.log("Lost connection, reconnecting to bus...");
			});

			client.on("reconnect", () => {
				client.isReconnecting = false;
				client.isConnected = true;
				console.log("Reconnected to NATS bus", options.address);
			});

			client.on("close", () => {
				client.isConnected = false;
				client.isClosed = true;
				console.log("Connection closed");
			});

			client.on("error", (e: any) => {
				client.isConnected = false;
				console.error("Error [" + client.busOptions?.address + "]: " + e);
				reject(e);
			});
		});
	}
}

export default FrusterBus;

class TestBus {
	constructor(private bus: FrusterBus) {}

	subscribe(options: SubscribeOptions | string, cb?: HandleFn) {
		return this.bus.subscribe(options, cb);
	}

	request<ReqData = any, ResData = any>(options: TestRequestOptions<ReqData>): Promise<FrusterResponse<ResData>> {
		return this.bus.request({
			...options,
			message: { ...options.message, reqId: options.message.reqId || uuid.v4() },
		});
	}

	requestMany(options: RequestOptions) {
		return this.bus.request({
			...options,
			message: { ...options.message, reqId: options.message.reqId || uuid.v4() },
		});
	}

	publish(options: PublishOptions) {
		// Note: Method is set when client is connected
		throw new Error("There are no connected client(s)");
	}
}
