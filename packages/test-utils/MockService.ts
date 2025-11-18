import {
	FrusterError,
	FrusterResponse,
	TestFrusterRequest,
} from "@fruster/bus";

type MockedResponse<T = any> =
	| MockFrusterResponse<T>
	| ((req: TestFrusterRequest<any>) => MockFrusterResponse<T>);

interface MockFrusterError extends Partial<FrusterError> {
	code: string;
}
interface MockFrusterResponse<T = any>
	extends Omit<FrusterResponse<T>, "data" | "status" | "error"> {
	data?: T;
	status?: number;
	error?: MockFrusterError;
}
export interface MockServiceOpts<T> {
	/**
	 * Subject to subscribe to
	 */
	subject: string;

	/**
	 * Fruster bus instance.
	 */
	bus: any;

	/**
	 * Mocked response that will returned.
	 * Can be a static response object or a function which takes the request as argument
	 * and returns the response.
	 *
	 * Either `response` or `responses` must be set!
	 */
	response?: MockedResponse<T>;

	/**
	 * Array of responses. Can be response objects and/or functions which takes the request
	 * as argument and returns the response.
	 *
	 * Either `response` or `responses` must be set!
	 */
	responses?: MockedResponse<T>[];

	/**
	 * If true, automatically unsubscribe after the first response is sent.
	 * Useful for one-shot mocks in complex flows.
	 *
	 * When using `responses` array, the mock will automatically unsubscribe
	 * after all responses have been sent regardless of this option.
	 */
	autoUnsubscribe?: boolean;
}

class MockService<T> {
	requests: TestFrusterRequest<any>[] = [];
	subject: string;
	bus: any;
	response?: MockedResponse<T>;
	responses?: MockedResponse<T>[];
	publishedResponses: any[] = [];
	autoUnsubscribe: boolean;
	private subscription?: any;

	constructor(opts: MockServiceOpts<T>) {
		this.subject = opts.subject;
		this.bus = opts.bus;
		this.response = opts.response;
		this.responses = opts.responses;
		this.publishedResponses = [];
		this.autoUnsubscribe = opts.autoUnsubscribe || false;
		this.subscribe();

		if (!this.responses && !this.response)
			throw new Error("response or responses must be set");

		if (this.responses && this.response)
			throw new Error("Both response and responses cannot be set");
	}

	get invocations() {
		return this.requests.length;
	}

	private subscribe() {
		this.subscription = this.bus.subscribe({
			subject: this.subject,
			// @ts-ignore: Fruster bus is missing TestFrusterResonse in testBus
			handle: this.handleReq,
		});
	}

	private handleReq = (req: TestFrusterRequest<any>) => {
		this.requests.push(req);
		const reqIndex = this.requests.length - 1;
		const response = this.getResponse(req, reqIndex);
		this.publishedResponses.push(response);

		// Auto-unsubscribe logic
		if (this.autoUnsubscribe) {
			// Unsubscribe after first response when autoUnsubscribe is enabled
			this.unsubscribe();
		} else if (this.responses && reqIndex === this.responses.length - 1) {
			// When using responses array, auto-unsubscribe after last response
			this.unsubscribe();
		}

		return response;
	};

	/**
	 * Get mocked response for request at provided index.
	 */
	private getResponse(req: TestFrusterRequest<any>, reqIndex: number) {
		let response: MockedResponse;

		if (this.responses) {
			response = this.responses[reqIndex];

			if (!response) {
				console.warn(
					`Missing mock response for subject '${this.subject}', request was:`,
					req
				);
				return {
					status: 500,
					error: {
						code: "MOCK_ERROR",
						detail:
							"No response declared for request #" +
							(reqIndex + 1),
					},
				};
			}

			response;
		} else if (this.response) {
			response = this.response;
		} else {
			throw new Error("Missing response for request");
		}

		const invokedResponse =
			typeof response === "function" ? response(req) : response;

		invokedResponse.status = invokedResponse.status || 200;

		return invokedResponse;
	}

	/**
	 * Unsubscribe from the subject. After calling this, the mock will no longer
	 * handle requests. This is useful for replacing mocks in complex test flows.
	 * Safe to call multiple times.
	 */
	unsubscribe() {
		if (this.subscription) {
			this.subscription.unsubscribe();
			this.subscription = undefined;
		}
	}

	/**
	 * Update the response for this mock. Useful for dynamically changing mock behavior.
	 * @param response New response to return (static or function)
	 */
	setResponse(response: MockedResponse<T>) {
		if (this.responses) {
			throw new Error(
				"Cannot call setResponse() when using responses array. Use setResponses() instead."
			);
		}
		this.response = response;
	}

	/**
	 * Update the responses array for this mock. Resets the request counter.
	 * @param responses New array of responses
	 */
	setResponses(responses: MockedResponse<T>[]) {
		if (this.response && !this.responses) {
			throw new Error(
				"Cannot call setResponses() when using single response. Use setResponse() instead."
			);
		}
		this.responses = responses;
		// Reset counters when updating responses
		this.requests = [];
		this.publishedResponses = [];
	}

	/**
	 * Debug logs request and responses.
	 */
	debug(prettyPrint = false) {
		const stringifyFn = (o: any) => {
			return JSON.stringify(o, null, prettyPrint ? 2 : 0);
		};

		for (let i = 0; i < this.requests.length; i++) {
			console.log("\nRequest:");
			console.log(stringifyFn(this.requests[i]));
			console.log("Response:");
			console.log(
				this.publishedResponses[i]
					? stringifyFn(this.publishedResponses[i])
					: "n/a"
			);
		}
	}
}

export default MockService;
