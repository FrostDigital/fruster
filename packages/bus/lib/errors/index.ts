import { ErrorModel } from "./ErrorModel";
import FrusterErrors from "./FrusterErrors";

export const errors = new FrusterErrors([]);

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
export function buildErrors(errorsModels: ErrorModel[]) {
	errors.addErrors(errorsModels);
	return errors;
}
