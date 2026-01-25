import * as fBus from "@fruster/bus";
import getPort from "get-port";
import MockService, { MockServiceOpts } from "./MockService";
const nsc = require("nats-server-control");

// Duck-typed MongoDB interfaces to avoid hard dependency
interface DuckDb {
	dropDatabase(): Promise<any>;
	collection(name: string): any;
	listCollections(): any;
}

interface DuckMongoClient {
	connect(): Promise<DuckMongoClient>;
	db(dbName?: string): DuckDb;
	close(): Promise<void>;
}

// Duck-typed MongoMemoryServer to avoid hard dependency
interface DuckMongoMemoryServer {
	getUri(): string;
	stop(): Promise<boolean>;
}

interface ServiceWithStart {
	[x: string]: any;
	start: ((natsUrl: string, mongoUrl?: string) => any);
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
	 * MongoDB connection URL. Requires mongodb package to be installed.
	 * Ignored if useInMemoryMongo is true.
	 */
	mongoUrl?: string;
	/**
	 * Whether to use in-memory MongoDB (mongodb-memory-server).
	 * Requires mongodb-memory-server package to be installed.
	 * If true, mongoUrl is ignored and an in-memory server is started.
	 */
	useInMemoryMongo?: boolean;
	/**
	 * Configuration for in-memory MongoDB server.
	 * Only used when useInMemoryMongo is true.
	 */
	inMemoryMongoOptions?: {
		/**
		 * Binary configuration for mongodb-memory-server
		 */
		binary?: {
			/**
			 * MongoDB version to use (e.g., "7.0.0", "6.0.0")
			 * Default: latest stable version
			 */
			version?: string;
		};
		/**
		 * Instance configuration for mongodb-memory-server
		 */
		instance?: {
			/**
			 * Port for the in-memory MongoDB server
			 * Default: random available port
			 */
			port?: number;
			/**
			 * Database name
			 * Default: "test"
			 */
			dbName?: string;
			/**
			 * Storage engine to use
			 * Default: "ephemeralForTest" (fastest for testing)
			 */
			storageEngine?: "ephemeralForTest" | "wiredTiger";
		};
	};
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
}

export interface FrusterTestUtilsConnection {
	db?: DuckDb;
	client?: DuckMongoClient;
	/**
	 * In-memory MongoDB server instance (if useInMemoryMongo was true)
	 */
	memoryServer?: DuckMongoMemoryServer;
	port: number;
	server: any;
	natsUrl: string;
	natsClient: any;
	bus: fBus.FrusterBus;
}

interface FrusterTestUtilsConnectionBuilder {
	db?: DuckDb;
	client?: DuckMongoClient;
	memoryServer?: DuckMongoMemoryServer;
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
	return startBefore(beforeAll, afterAll, options);
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

	// Track mock services for cleanup
	const mockServices: any[] = [];

	// Return a helper object with cleanup methods bound to this connection
	return {
		connection: () => connection,
		cleanupBeforeEach: (
			cleanup: (connection: FrusterTestUtilsConnection) => Promise<void> | void
		) => {
			beforeEach(async () => {
				try {
					await cleanup(connection);
				} catch (err) {
					console.log("Failed cleanup before each with error:", err);
					fail();
				}
			});
		},
		dropDatabaseBeforeEach: () => {
			beforeEach(async () => {
				try {
					if (!connection.db) {
						return;
					}

					// Only allow dropping in-memory databases for safety
					if (!connection.memoryServer) {
						console.warn(
							"⚠️  WARNING: dropDatabaseBeforeEach only works with in-memory MongoDB (useInMemoryMongo: true). " +
							"For safety, it will not drop external databases. " +
							"Use cleanupBeforeEach() with custom logic for external databases."
						);
						return;
					}

					await connection.db.dropDatabase();
				} catch (err) {
					console.log("Failed dropping database before each with error:", err);
					fail();
				}
			});
		},
		dropCollectionsBeforeEach: () => {
			beforeEach(async () => {
				try {
					if (!connection.db) {
						return;
					}

					// Only allow dropping in-memory databases for safety
					if (!connection.memoryServer) {
						console.warn(
							"⚠️  WARNING: dropCollectionsBeforeEach only works with in-memory MongoDB (useInMemoryMongo: true). " +
							"For safety, it will not drop collections from external databases. " +
							"Use cleanupBeforeEach() with custom logic for external databases."
						);
						return;
					}

					const collections = await connection.db.listCollections().toArray();

					await Promise.all(
						collections.map((col: any) =>
							connection.db!.collection(col.name).drop()
						)
					);
				} catch (err) {
					console.log("Failed dropping collections before each with error:", err);
					fail();
				}
			});
		},
		/**
		 * Unsubscribe all mock services created between tests.
		 * Use this to clean up mock subscriptions when using startBeforeAll().
		 *
		 * Example:
		 * ```typescript
		 * const helpers = testUtils.startBeforeAll({ bus, mockNats: true });
		 * helpers.unsubscribeMocksBeforeEach();
		 *
		 * it("test 1", () => {
		 *   const mock = helpers.mockService({ subject: "foo", response: { data: "bar" } });
		 *   // mock is automatically tracked and will be cleaned up
		 * });
		 * ```
		 */
		unsubscribeMocksBeforeEach: () => {
			beforeEach(() => {
				try {
					mockServices.forEach((mock) => {
						if (mock && typeof mock.unsubscribe === "function") {
							mock.unsubscribe();
						}
					});
					mockServices.length = 0; // Clear the array
				} catch (err) {
					console.log("Failed unsubscribing mocks before each with error:", err);
					fail();
				}
			});
		},
		/**
		 * Create a mock service that will be automatically cleaned up with unsubscribeMocksBeforeEach().
		 * This is a convenience wrapper around testUtils.mockService() that tracks the mock.
		 */
		mockService: <T = any>(
			options: Omit<MockServiceOpts<T>, "bus">
		) => {
			const mock = new MockService<T>({
				...options,
				bus: connection.bus,
			});
			mockServices.push(mock);
			return mock;
		},
	};
}

/**
 * Start nats, mongo (optional), fruster bus, a service - all depending on options.
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
 * 			// Optional: Providing a mongo url will connect to MongoDB
 * 			// Requires mongodb package to be installed: pnpm add -D mongodb
 *			mongoUrl: "mongodb://localhost:27017/test-db",
 *
 *          // Fruster bus to connect
 *			bus: bus,
 *
 *			// Will start service - this requires the service to have a
 * 			// function named `start` where first argument is nats bus address
 * 			// and optional second argument is mongo url (if provided)
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
			// Determine MongoDB URL: either from memory server or external URL
			const mongoUri = connection.memoryServer
				? connection.memoryServer.getUri()
				: opts.mongoUrl;

			if (mongoUri) {
				// Call with both natsUrl and mongoUrl
				await opts.service.start(connection.natsUrl, mongoUri);
			} else {
				// Call with only natsUrl
				await opts.service.start(connection.natsUrl);
			}
		}

		return connection;
	}

	return connection;
}

/**
 * Start an in-memory MongoDB server using mongodb-memory-server
 */
async function startInMemoryMongo(
	opts?: FrusterTestUtilsOptions["inMemoryMongoOptions"]
): Promise<{
	uri: string;
	server: DuckMongoMemoryServer;
}> {
	try {
		// Dynamic import - only loads if mongodb-memory-server is installed
		const { MongoMemoryServer } = require("mongodb-memory-server");

		const server = await MongoMemoryServer.create({
			binary: opts?.binary,
			instance: opts?.instance,
		});

		const uri = server.getUri();
		return { uri, server };
	} catch (error: any) {
		if (error.code === "MODULE_NOT_FOUND") {
			throw new Error(
				'In-memory MongoDB support requires the "mongodb-memory-server" package. ' +
				"Install it with: pnpm add -D mongodb-memory-server\n" +
				"Original error: " + error.message
			);
		}
		console.log("Failed starting in-memory MongoDB server", error);
		throw error;
	}
}

async function connectToMongo(
	opts: FrusterTestUtilsOptions,
	connection: FrusterTestUtilsConnectionBuilder
) {
	// Determine MongoDB URL
	let mongoUri: string | undefined;
	let memoryServer: DuckMongoMemoryServer | undefined;

	if (opts.useInMemoryMongo) {
		// Start in-memory MongoDB server
		const result = await startInMemoryMongo(opts.inMemoryMongoOptions);
		mongoUri = result.uri;
		memoryServer = result.server;
		connection.memoryServer = memoryServer;
	} else if (opts.mongoUrl) {
		// Use external MongoDB URL
		mongoUri = opts.mongoUrl;
	}

	if (!mongoUri) {
		return connection;
	}

	try {
		// Dynamic import - only loads if mongodb is installed
		const mongodb = require("mongodb");
		const MongoClient = mongodb.MongoClient;

		const client = new MongoClient(mongoUri);
		await client.connect();

		connection.db = client.db();
		connection.client = client;
		return connection;
	} catch (error: any) {
		// Clean up memory server if connection failed
		if (memoryServer) {
			try {
				await memoryServer.stop();
			} catch (e) {
				console.log("Failed stopping memory server after connection error", e);
			}
		}

		if (error.code === "MODULE_NOT_FOUND") {
			throw new Error(
				'MongoDB support requires the "mongodb" package to be installed. ' +
				"Install it with: pnpm add mongodb (or pnpm add -D mongodb for test-only usage)\n" +
				"Original error: " + error.message
			);
		}
		console.log(`Test utils failed connecting to mongo on ${mongoUri}`, error);
		throw error;
	}
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

/**
 * Check if NATS server is available on the system
 */
export function isNatsServerAvailable(): boolean {
	const { spawnSync } = require("child_process");
	const natsServerBinary = process.env.GNATSD || "nats-server";

	try {
		const result = spawnSync(natsServerBinary, ["--version"], {
			stdio: "ignore",
		});
		return result.status === 0;
	} catch {
		return false;
	}
}

export async function startNatsServer(
	opts?: Pick<FrusterTestUtilsOptions, "natsPort" | "bus">
) {
	const anAvailablePort = await getPort();

	opts = opts || {};
	const natsServerPort = opts.natsPort || anAvailablePort;
	const natsUrl = "nats://localhost:" + natsServerPort;

	let connection: FrusterTestUtilsConnection = {
		server: null,
		natsUrl: natsUrl,
		port: natsServerPort,
		bus: opts.bus!,
		natsClient: undefined,
	};

	// Set environment variable to use modern nats-server binary
	if (!process.env.GNATSD) {
		process.env.GNATSD = "nats-server";
	}

	// Check if NATS server is available
	if (!isNatsServerAvailable()) {
		const error = new Error(
			"NATS server is not installed or not in PATH. " +
			"Install it from https://docs.nats.io/running-a-nats-service/introduction/installation " +
			"or use mockNats: true option for in-memory testing."
		);
		(error as any).code = "NATS_NOT_INSTALLED";
		throw error;
	}

	try {
		connection.server = await nsc.startServer(natsServerPort);
		return connection;
	} catch (err: any) {
		// Provide helpful error message for missing NATS server
		if (err.message && err.message.includes("Can't find the")) {
			const enhancedError = new Error(
				"NATS server binary not found. " +
				"Install NATS server from https://docs.nats.io/running-a-nats-service/introduction/installation " +
				"or use mockNats: true option for in-memory testing. " +
				"Original error: " + err.message
			);
			(enhancedError as any).code = "NATS_NOT_INSTALLED";
			throw enhancedError;
		}

		console.log(`Failed starting NATS server on port ${anAvailablePort}`);
		throw err;
	}
}

/**
 * Stop nats, close fruster bus connection(s) and close MongoDB connections
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

	// MongoDB cleanup
	if (connection.client) {
		try {
			await connection.client?.close();
		} catch (e) {
			console.log("Failed closing MongoDB connection", e);
		}
	}

	// Stop in-memory MongoDB server if running
	if (connection.memoryServer) {
		try {
			await connection.memoryServer.stop();
		} catch (e) {
			console.log("Failed stopping in-memory MongoDB server", e);
		}
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
	isNatsServerAvailable,
	startBeforeEach,
	startBeforeAll,
	mockService,
};

export default TestUtils;
