// TODO: These might be redundant

/**
 * Model used to define errors.
 */
export interface ErrorModel {
	status: number;
	code: string;
	title: string;
	detail?: string | ((...args: any[]) => string);
}

/**
 * Model used when sending error according to fruster bus message model.
 */
export interface ApiErrorModel {
	status: number;
	data: any;
	error: Omit<ErrorModel, "status">;
}

export interface ImmutableApiError extends Omit<ApiErrorModel, "error"> {
	error: Omit<ApiErrorModel["error"], "detail"> & { detail?: string; id: string };
	thrower?: string;
}
