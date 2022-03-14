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
}

class MockService<T> {
	requests: TestFrusterRequest<any>[] = [];
	subject: string;
	bus: any;
	response?: MockedResponse<T>;
	responses?: MockedResponse<T>[];
	publishedResponses: any[] = [];

	constructor(opts: MockServiceOpts<T>) {
		this.subject = opts.subject;
		this.bus = opts.bus;
		this.response = opts.response;
		this.responses = opts.responses;
		this.publishedResponses = [];
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
		this.bus.subscribe({
			subject: this.subject,
			// @ts-ignore: Fruster bus is missing TestFrusterResonse in testBus
			handle: this.handleReq,
		});
	}

	private handleReq = (req: TestFrusterRequest<any>) => {
		this.requests.push(req);
		const response = this.getResponse(req, this.requests.length - 1);
		this.publishedResponses.push(response);
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
