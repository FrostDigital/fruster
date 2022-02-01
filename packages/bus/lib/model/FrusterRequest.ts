/**
 * Fruster request model, only used for JSDoc.
 *
 * @template T the type of data
 */
export interface FrusterRequest<T = any> {
	/**
	 * Request id
	 */
	reqId: string;

	/**
	 * Transaction id
	 */
	transactionId: Readonly<string>;

	/**
	 * Method used if request was HTTP
	 */
	method: string; // TODO: Optional?

	/**
	 * Path used for reqruest if request was HTTP
	 */
	path: string; // TODO: Optional?

	/**
	 * Request body
	 */
	data: T;

	/**
	 * Logged in user
	 */
	user: object & { id: string; scopes: string[] }; // TODO: Optional?

	/**
	 * HTTP query params
	 */
	query: { [x: string]: string }; // TODO: Optional?

	/**
	 * HTTP path params
	 */
	params: { [x: string]: string }; // TODO: Optional?

	/**
	 * HTTP headers
	 */
	headers: { [x: string]: string }; // TODO: Optional?

	/**
	 * Information where response came from
	 */
	from: Readonly<{
		service: string;
		instanceId: String;
	}>;

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
