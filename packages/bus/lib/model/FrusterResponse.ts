import { FrusterError } from "./FrusterError";

/**
 * Fruster response model, only used for JSDoc.
 *
 * @template T the type of data
 */
export interface FrusterResponse<T = any> {
	/**
	 * Request id
	 */
	reqId: string;

	/**
	 * (http) status code of response
	 */
	status: number;

	/**
	 * Transaction id
	 */
	transactionId: Readonly<string>;

	data: T;

	/**
	 * Error data, set if response is an error
	 */
	error?: FrusterError;

	/**
	 * Information where response came from
	 */
	from: Readonly<{
		service: string;
		instanceId: String;
	}>;

	/**
	 * HTTP headers
	 */
	headers: { [x: string]: string }; // TODO: Optional?

	/**
	 * Optional encoding
	 */
	dataEncoding?: string;

	ms?: Readonly<number>;

	/**
	 * Service that threw the error, if any.
	 */
	thrower?: string;
}
