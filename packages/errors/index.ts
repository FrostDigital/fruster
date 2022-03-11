import { ErrorModel } from "./lib/ErrorModel";
import FrusterErrors from "./lib/FrusterErrors";

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
export = (errorModels: ErrorModel[] = []) => {
	return new FrusterErrors(errorModels);
};
