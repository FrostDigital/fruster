export const BAD_REQUEST = "BAD_REQUEST";
export const UNAUTHORIZED = "UNAUTHORIZED";
export const FORBIDDEN = "FORBIDDEN";
export const NOT_FOUND = "NOT_FOUND";
export const INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR";
export const DEFAULT_ERRORS = [
	{
		code: BAD_REQUEST,
		status: 400,
		title: "Bad request",
	},
	{
		code: UNAUTHORIZED,
		status: 401,
		title: "Invalid or missing credentials",
	},
	{
		code: FORBIDDEN,
		status: 403,
		title: "Not allowed to access resource",
	},
	{
		code: NOT_FOUND,
		status: 404,
		title: "Resource was not found",
	},
	{
		code: INTERNAL_SERVER_ERROR,
		status: 500,
		title: "Server encountered an unexpected error",
	},
];
