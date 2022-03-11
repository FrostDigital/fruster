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
	error: Omit<ErrorModel, "status">;
}
