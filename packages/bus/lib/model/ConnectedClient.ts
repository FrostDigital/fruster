import { Client } from "nats";

export interface ConnectedClient extends Client {
	busOptions?: ConnectOptions;
	isConnected?: boolean;
	isClosed?: boolean;
	isReconnecting?: boolean;
}

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
}
