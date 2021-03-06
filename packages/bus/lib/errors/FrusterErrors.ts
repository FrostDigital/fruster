import { v4 } from "uuid";
import { BAD_REQUEST, DEFAULT_ERRORS, FORBIDDEN, INTERNAL_SERVER_ERROR, NOT_FOUND, UNAUTHORIZED } from "./constants";
import { ErrorModel, ApiErrorModel, ImmutableApiError } from "./ErrorModel";

class FrusterErrors {
	errors: { [k: string]: ApiErrorModel } = {};

	constructor(errorModels: ErrorModel[]) {
		this.buildErrors(errorModels);
	}

	addErrors(errorModels: ErrorModel[], failDups = false) {
		errorModels.forEach((errorModel) => {
			if (failDups && this.errors[errorModel.code]) {
				const msg = `FATAL: Error ${errorModel.code} already defined, you probably entered a duplicate!`;
				console.error(msg);
				throw msg;
			}

			this.errors[errorModel.code] = {
				status: errorModel.status,
				data: undefined,
				error: {
					code: errorModel.code,
					title: errorModel.title,
					detail: errorModel.detail,
				},
			};
		});
	}

	/**
	 * Build errors based on error model.
	 *
	 * Will add default errors BAD_REQUEST, NOT_FOUND, UNAUTHORIZED,
	 * FORBIDDEN and INTERNAL_SERVER_ERROR if those are not provided.
	 *
	 */
	private buildErrors(errorModels: ErrorModel[]) {
		// Append default errors to errorModel, if needed to.
		DEFAULT_ERRORS.forEach((defaultError) => {
			if (!errorModels.find((error) => error.code === defaultError.code)) {
				errorModels.push(defaultError);
			}
		});

		this.addErrors(errorModels, true);
	}

	get(code: string, ...detailParams: any[]): ImmutableApiError {
		const error = this.errors[code];

		if (!error) {
			const msg = `FATAL: Error ${code} not defined`;
			console.error(msg);
			throw msg;
		}

		const err = {
			status: error.status,
			data: undefined,
			error: {
				...error.error,
				id: v4(),
				detail: this.getErrorDetail(error, ...detailParams),
			},
		};

		err.toString = () => {
			return JSON.stringify(err);
		};

		return err;
	}

	private getErrorDetail(error: ApiErrorModel, ...detailParams: any[]) {
		if (typeof error.error.detail === "function") {
			return error.error.detail(...detailParams);
		} else if (detailParams) {
			return detailParams.join("\n");
		}
	}

	reject(code: string, ...detailParams: any[]) {
		return Promise.reject(this.get(code, ...detailParams));
	}

	/**
	 * Resets any previously added custom errors.
	 * Will revert back to only default errors.
	 *
	 * Probably only useful when writing tests.
	 */
	reset() {
		this.errors = {};
		this.buildErrors([]);
	}

	/**
	 * BAD_REQUEST error.
	 *
	 * @param {Array=} detail
	 */
	badRequest(...detail: any[]) {
		return this.get(BAD_REQUEST, detail);
	}

	/**
	 * UNAUTHORIZED error.
	 *
	 * @param {Array=} detail
	 */
	unauthorized(...detail: any[]) {
		return this.get(UNAUTHORIZED, detail);
	}

	/**
	 * FORBIDDEN error.
	 *
	 * @param {Array=} detail
	 */
	forbidden(...detail: any[]) {
		return this.get(FORBIDDEN, detail);
	}

	/**
	 * NOT_FOUND error.
	 *
	 * @param {Array=} detail
	 */
	notFound(...detail: any[]) {
		return this.get(NOT_FOUND, detail);
	}

	/**
	 * INTERNAL_SERVER_ERROR error.
	 *
	 * @param {Array=} detail
	 */
	internalServerError(...detail: any[]) {
		return this.get(INTERNAL_SERVER_ERROR, detail);
	}
}

export default FrusterErrors;
