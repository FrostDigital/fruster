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
	reqId?: string;

	/**
	 * (http) status code of response
	 */
	status?: number;

	/**
	 * Transaction id
	 */
	transactionId?: string;

	data?: T;

	/**
	 * Error data, set if response is an error
	 */
	error?: FrusterError;

	/**
	 * HTTP headers
	 */
	headers?: { [x: string]: string };

	/**
	 * Optional encoding
	 */
	dataEncoding?: string;

	/**
	 * Service that threw the error, if any.
	 */
	thrower?: string;

	/**
	 * Number of data chunks if large response that requires chunking
	 */
	chunks?: number;

	/**
	 * Chunk index, if response is a "chunk".
	 */
	chunk?: number;

	/**
	 * Optional data subject used to send subsequent chunks to.
	 */
	dataSubject?: string;

	/**
	 * Milliseconds it took to process the request and return response
	 */
	ms?: number;
}

export interface ImmutableFrusterResponse<T = any> extends FrusterResponse<T> {
	/**
	 * HTTP headers
	 */
	headers?: Readonly<{ [x: string]: string }>;

	/**
	 * Information where response came from
	 */
	from: Readonly<{
		service: string;
		instanceId: String;
	}>;

	/**
	 * Milliseconds it took to process the request and return response
	 */
	ms?: Readonly<number>;
}
