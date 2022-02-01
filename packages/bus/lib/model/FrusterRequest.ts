/**
 * Fruster request model, only used for JSDoc.
 *
 * @template T the type of data
 */
export interface FrusterRequest<T = any> {
	/**
	 * Request id.
	 *
	 * Identifier for whole message sequence. Request id should be passed
	 * thru to subsequent messages.
	 */
	reqId: string;

	/**
	 * Transaction id.
	 *
	 * Identifies a request - response pair.
	 */
	transactionId: string;

	/**
	 * Request body
	 */
	data: T;

	/**
	 * Logged in user
	 */
	user?: object & { id: string; scopes: string[] };

	/**
	 * Path used for request if request was HTTP
	 */
	path?: string;

	/**
	 * Method used if request was HTTP
	 */
	method?: string;

	/**
	 * HTTP query params
	 */
	query: { [x: string]: string };

	/**
	 * HTTP path params
	 */
	params: { [x: string]: string };

	/**
	 * HTTP headers
	 */
	headers: { [x: string]: string };

	/**
	 * Optional encoding
	 */
	dataEncoding?: string;

	/**
	 * Number of data chunks if data payload is large and requires chunking, meaning
	 * that the request will be slit up into smaller pieces.
	 */
	chunks?: number;
}

export interface ImmutableFrusterRequest<T = any> extends FrusterRequest<T> {
	/**
	 * Request id
	 */
	reqId: Readonly<string>;

	/**
	 * Transaction id
	 */
	transactionId: Readonly<string>;

	/**
	 * Path used for request if request was HTTP
	 */
	path?: Readonly<string>;

	/**
	 * Method used if request was HTTP
	 */
	method?: Readonly<string>;

	/**
	 * HTTP query params
	 */
	query: Readonly<{ [x: string]: string }>;

	/**
	 * HTTP path params
	 */
	params: Readonly<{ [x: string]: string }>;

	/**
	 * HTTP headers
	 */
	headers: Readonly<{ [x: string]: string }>;

	/**
	 * Optional encoding
	 */
	dataEncoding?: Readonly<string>;

	/**
	 * Number of data chunks if data payload is large and requires chunking, meaning
	 * that the request will be slit up into smaller pieces.
	 */
	chunks?: Readonly<number>;

	/**
	 * Information where response came from
	 */
	from?: Readonly<{
		service: string;
		instanceId: String;
	}>;
}
