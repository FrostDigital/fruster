import * as fBus from "@fruster/bus";
import getPort from "get-port";
import { Db, MongoClient } from "mongodb";
import MockService, { MockServiceOpts } from "./MockService";
const nsc = require("nats-server-control");

interface ServiceWithStart {
	[x: string]: any;
	start:
		| ((natsUrl: string) => any)
		| ((natsUrl: string, mongoUrl: string) => any);
}

let bus: fBus.FrusterBus;

type BeforeFn = typeof beforeAll | typeof beforeEach;
type AfterFn = typeof afterAll | typeof afterEach;

export interface FrusterTestUtilsOptions {
	/**
	 * Service to be started.
	 */
	service?:
		| ((connection: FrusterTestUtilsConnection) => any)
		| ServiceWithStart;
	/**
	 * Bus to be started.
	 */
	bus?: fBus.FrusterBus;
	/**
	 * Function to run before start.
	 */
	beforeStart?: () => void | Promise<void>;
	/**
	 * Function to run after start.
	 */
	afterStart?: (
		connection: FrusterTestUtilsConnection
	) => void | Promise<void>;
	/**
	 * Function to run before stopping.
	 */
	beforeStop?: (
		connection: FrusterTestUtilsConnection
	) => void | Promise<void>;
	/**
	 * The mongo url to connect to.
	 */
	mongoUrl?: string;
	/**
	 * Optional nats port, if none is provided this will be randomized.
	 */
	natsPort?: number;
	/**
	 * If to start mocked in-memory nats.
	 */
	mockNats?: boolean;
	/**
	 * Whether or not to use the resulting client as a singleton.
	 */
	singleton?: boolean;
	/**
	 * Optional schema resolver.
	 */
	schemaResolver?: any;
	/**
	 * If to drop database after test is done.
	 */
	dropDatabase?: boolean;
}

export interface FrusterTestUtilsConnection {
	db: Db;
	client?: MongoClient;
	port: number;
	server: any;
	natsUrl: string;
	natsClient: any;
	bus: fBus.FrusterBus;
}

interface FrusterTestUtilsConnectionBuilder {
	db?: Db;
	client?: MongoClient;
	port?: number;
	server?: any;
	natsUrl?: string;
	natsClient?: any;
	bus?: fBus.FrusterBus;
}

export function startBeforeEach(options: FrusterTestUtilsOptions) {
	startBefore(beforeEach, afterEach, options);
}

export function startBeforeAll(options: FrusterTestUtilsOptions) {
	startBefore(beforeAll, afterAll, options);
}

/**
 * Convenient function to start service using beforeEach/beforeAll and
 * stop afterEach/afterAll
 */
function startBefore(
	beforeFn: BeforeFn,
	afterFn: AfterFn,
	options: FrusterTestUtilsOptions
) {
	return new Promise((resolve) => {
		let connection: FrusterTestUtilsConnection;

		beforeFn(async () => {
			try {
				if (options.beforeStart) {
					await options.beforeStart();
				}

				connection = await start(options);

				if (options.afterStart) {
					await options.afterStart(connection);
				}

				resolve(connection);
			} catch (err) {
				console.log("Failed beforeEach/All with error:", err);
				fail();
			}
		});

		afterFn(async () => {
			try {
				if (options.beforeStop) {
					await options.beforeStop(connection);
				}
			} catch (err) {
				console.log("Failed beforeStop with error:", err);
				fail();
			}

			await stop(connection, options);
		});
	});
}

/**
 * Start nats, mongo, fruster bus, a service - all depending on options.
 * Will return a `connection` object that holds all details about above
 * connections.
 *
 * To start it all:
 *
 *     	testUtils.start({
 *			// Optional nats port, if none is provided this will be randomized
 *			natsPort: 4321,
 *
 * 			// If mocked (in-memory) version of NATS should be used.
 * 			// Will ignore `natsPort` if set to true
 * 			mockNats: false,
 *
 * 			// Providing a mongo url will start mongo
 *			mongoUrl: "mongo://localhost:27017",
 *
 *          // Fruster bus to connect
 *			bus: bus,
 *
 *			// Will start service - this requries the service to have a
 * 			// function named `start` where first argument is nats bus address
 *			// and second argument is mongo (if prevoiusly connected)
 *			service: fooService
 *		})

 * @param {FrusterTestUtilsOptions} opts
 *
 * @return {Promise<FrusterTestUtilsConnection>}
 */
export async function start(opts: FrusterTestUtilsOptions) {
	if (!("singleton" in opts)) {
		if (!opts) opts = {};

		opts.singleton = true;
	}

	if (opts.bus && opts.bus.clearClients && opts && opts.singleton)
		opts.bus.clearClients();

	if (bus && opts && opts.singleton) bus.clearClients();

	let connection: FrusterTestUtilsConnectionBuilder = {};

	if (opts.mockNats) {
		connection = {
			natsUrl: "nats://mock",
			bus: opts.bus,
		};
	} else {
		connection = await startNatsServer(opts);
	}

	await connectToMongo(opts, connection);
	await connectBus(opts, connection);
	await startService(opts, connection);

	return connection as FrusterTestUtilsConnection;
}

async function startService(
	opts: FrusterTestUtilsOptions,
	connection: FrusterTestUtilsConnectionBuilder
) {
	if (opts.service) {
		if (typeof opts.service === "function") {
			await opts.service(connection as FrusterTestUtilsConnection);
			return connection;
		}

		if (!opts.service.start) {
			throw new Error("Missing function start(..)");
		}

		if (!connection.natsUrl) {
			throw new Error(
				"Missing natsUrl, either enable mockNats or provide natsUrl"
			);
		}

		if (connection.natsUrl) {
			if (opts.mongoUrl) {
				await opts.service.start(connection.natsUrl, opts.mongoUrl);
			} else {
				// @ts-ignore for some reason ts compiler does not allow a single argument here :/
				await opts.service.start(connection.natsUrl);
			}
		}

		return connection;
	}

	return connection;
}

async function connectToMongo(
	opts: FrusterTestUtilsOptions,
	connection: FrusterTestUtilsConnectionBuilder
) {
	if (opts.mongoUrl) {
		const client = new MongoClient(opts.mongoUrl);
		try {
			await client.connect();
		} catch (e) {
			console.log(
				`Test utils failed connecting to mongo on ${opts.mongoUrl}`,
				e
			);
			throw e;
		}
		connection.db = client.db();
		connection.client = client;
		return connection;
	}
	return connection;
}

async function connectBus(
	opts: FrusterTestUtilsOptions,
	connection: FrusterTestUtilsConnectionBuilder
) {
	bus = opts.bus || bus;
	if (opts.bus) {
		bus = opts.bus;

		connection.natsClient = await opts.bus.connect({
			address: connection.natsUrl,
			singleton: "singleton" in opts ? opts.singleton : true,
			// @ts-ignore: Until schema resolver is added in non alpha release of bus
			schemaResolver: opts.schemaResolver,
		});
	}

	return connection;
}

export async function startNatsServer(
	opts?: Pick<FrusterTestUtilsOptions, "natsPort" | "bus">
) {
	const anAvailablePort = await getPort();

	opts = opts || {};
	const natsServerPort = opts.natsPort || anAvailablePort;
	const natsUrl = "nats://localhost:" + natsServerPort;

	let connection: Omit<FrusterTestUtilsConnection, "db"> = {
		server: null,
		natsUrl: natsUrl,
		port: natsServerPort,
		bus: opts.bus!,
		natsClient: undefined,
	};

	try {
		connection.server = await nsc.startServer(natsServerPort);
		return connection;
	} catch (err) {
		console.log(`Failed starting NATS server on port ${anAvailablePort}`);
		throw err;
	}
}

/**
 * Stop nats, close fruster bus connection(s) and drop database
 */
export async function stop(
	connection: Partial<FrusterTestUtilsConnection>,
	options?: FrusterTestUtilsOptions
) {
	if (connection.bus && connection.bus.closeAll) connection.bus.closeAll();

	if (connection.bus && options?.singleton) {
		connection.bus.clearClients();
	}

	if (connection.server) {
		try {
			connection.server.kill();
		} catch (e) {
			console.log("Failed killing nats server", e);
		}
	}

	if (connection.client) {
		if (options?.dropDatabase) {
			try {
				await connection.db?.dropDatabase();
			} catch (e) {
				console.log("Failed dropping database", e);
			}
		}

		await connection.client?.close();
	}
}

// Alias for stop
export function close(
	connection: Partial<FrusterTestUtilsConnection>,
	options?: FrusterTestUtilsOptions
) {
	return stop(connection, options);
}

/**
 * Convenient function to mock a service which can be used
 * in tests and perform tests/set expectations on requests
 * and responses.
 *
 * Example:
 *
 * testUtil.mockService({
 * 		subject: "user-service.get-user",
 *      response: {
 * 			data: { foo: "bar" }
 * 		}
 * })
 *
 */
export function mockService<T = any>(
	options: Omit<MockServiceOpts<T>, "bus"> & { bus?: any }
) {
	if (!(options.bus || bus)) {
		throw new Error("Missing bus in mockService");
	}

	return new MockService<T>({
		...options,
		bus: options.bus || bus,
	});
}

const TestUtils = {
	start,
	stop,
	close,
	startNatsServer,
	startBeforeEach,
	startBeforeAll,
	mockService,
};

export default TestUtils;
