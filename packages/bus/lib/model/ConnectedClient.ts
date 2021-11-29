import { Client } from "nats";

export interface ConnectedClient extends Client {
	busOptions?: ConnectOptions;
	isConnected?: boolean;
	isClosed?: boolean;
	isReconnecting?: boolean;
}

// export interface ConnectParams {
// 	address: string | string[];
// }

export interface ConnectOptions {
	/**
	 * Bus address(es) to connect to
	 */
	address: string | string[];

	/**
	 * Whether or not the resulting fruster bus client should be a singleton and used for all future connections
	 */
	singleton?: boolean;

	/**
	 * Directory where request/response schemas are located.
	 */
	schemasDir?: string;

	/**
	 * Optional schema resolver
	 */
	schemaResolver?: SchemaResolver;
}

interface SchemaResolver {
	/**
	 * Optional filter to decide if schema file should be parsed by customer schema resolver, will parse all files if not set
	 */
	filter?: () => any; // TODO: Params
	/**
	 * Function invoked when schema bus is about to add schema, should return array of parsed schemas
	 */
	addSchemas: () => any[];
}
