type Params = { [x: string]: string };
type Query = { [x: string]: string };

export type User = { id: string; scopes: string[]; [x: string]: any };

/**
 * Fruster request model.
 *
 * @template T the type of data
 */
export interface FrusterRequest<T = any, P = Params, Q = Query> {
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
	 * Identifies a request - response pair. Is generated and set when
	 * request is created.
	 */
	transactionId: string;

	/**
	 * Request body
	 */
	data: T;

	/**
	 * Logged in user
	 */
	user: User;

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
	query: Q;

	/**
	 * HTTP path params
	 */
	params: P;

	/**
	 * HTTP headers
	 */
	headers: { [x: string]: string };

	/**
	 * Optional encoding
	 */
	dataEncoding?: string;

	/**
	 * Subject that requester will subscribe on if responder needs to
	 * chunk response data.
	 */
	dataSubject?: string;

	/**
	 * Number of data chunks if data payload is large and requires chunking, meaning
	 * that the request will be slit up into smaller pieces.
	 */
	chunks?: number;
}

export interface CreateFrusterRequest<T = any>
	extends Omit<FrusterRequest<T>, "data" | "reqId" | "transactionId" | "params" | "query" | "user" | "headers"> {
	reqId?: string;
	data?: T;
	transactionId?: string;
	params?: { [x: string]: string };
	query?: { [x: string]: string };
	user?: User;
	headers?: FrusterRequest["headers"];
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
	from: Readonly<{
		service: string;
		instanceId: String;
	}>;
}

export interface TestFrusterRequest<T = any>
	extends Omit<CreateFrusterRequest<T>, "reqId" | "user" | "headers" | "transactionId"> {
	reqId?: string;
	headers?: { [x: string]: string };
	user?: Partial<User>;
}

export interface RequestOptions<T = any> {
	subject: string;
	message: CreateFrusterRequest<T>;
	timeout?: number;
	throwErrors?: boolean;
}

export interface RequestManyOptions<T = any> extends RequestOptions<T> {
	maxResponses?: number;
}

export interface TestRequestOptions<T = any> extends Omit<RequestOptions, "message"> {
	message: TestFrusterRequest<T>;
}
