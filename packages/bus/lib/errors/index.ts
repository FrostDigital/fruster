import { ErrorModel } from "./ErrorModel";
import FrusterErrors from "./FrusterErrors";

export class Errors {
	static instance = new FrusterErrors([]);

	static get errors() {
		return Errors.instance;
	}

	/**
	 * Create errors based on provided error model.
	 * These errors will be added as default if none are provided:
	 *
	 * `400 BAD_REQUEST`
	 * `401 UNAUTHORIZED`
	 * `403 FORBIDDEN`
	 * `404 NOT_FOUND`
	 * `500 INTERNAL_SERVER_ERROR`
	 */
	static buildErrors(errorsModels: ErrorModel[]) {
		Errors.instance = new FrusterErrors(errorsModels);
		return Errors.instance;
	}
}

export default Errors.errors;
export const buildErrors = Errors.buildErrors;
