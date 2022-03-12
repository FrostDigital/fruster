import log from "@fruster/log";
import { v4 } from "uuid";
import {
	BAD_REQUEST,
	DEFAULT_ERRORS,
	FORBIDDEN,
	INTERNAL_SERVER_ERROR,
	NOT_FOUND,
	UNAUTHORIZED,
} from "./constants";
import { ErrorModel, ApiErrorModel } from "./ErrorModel";

class FrusterErrors {
	errors: { [k: string]: ApiErrorModel } = {};

	constructor(errorModels: ErrorModel[]) {
		this.buildErrors(errorModels);
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
			if (
				!errorModels.find((error) => error.code === defaultError.code)
			) {
				errorModels.push(defaultError);
			}
		});

		errorModels.forEach((errorModel) => {
			if (this.errors[errorModel.code]) {
				const msg = `FATAL: Error ${errorModel.code} already defined, you probably entered a duplicate!`;
				log.error(msg);
				throw msg;
			}

			this.errors[errorModel.code] = {
				status: errorModel.status,
				error: {
					code: errorModel.code,
					title: errorModel.title,
					detail: errorModel.detail,
				},
			};
		});
	}

	get(code: string, ...detailParams: any[]) {
		const error = this.errors[code];

		if (!error) {
			const msg = `FATAL: Error ${code} not defined`;
			log.error(msg);
			throw msg;
		}

		const err = {
			status: error.status,
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
