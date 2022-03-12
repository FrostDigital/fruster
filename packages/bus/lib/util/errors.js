const errors = [
	{
		status: 400,
		code: "BAD_REQUEST",
		title: "Request has missing or invalid fields",
		detail: (errorText) => `${errorText}`,
	},
	{
		status: 500,
		code: "BAD_RESPONSE",
		title: "Response has missing or invalid fields",
		detail: (errorText) => `${errorText}`,
	},
	{
		status: 400,
		code: "INVALID_DATA_ENCODING",
		title: "Invalid data encoding in response/request",
		detail: (data) => `Cannot decompress data, unrecognized data encoding: ${data}`,
	},
	{
		status: 408,
		code: "BUS_RESPONSE_TIMEOUT",
		title: "Bus response timed out",
		detail: (subject, timeout) => `Expected response for ${subject} within ${timeout} ms`,
	},
	{
		status: 403,
		code: "PERMISSION_DENIED",
		title: "Permission denied",
		detail: (permissionsText) => "User does not have permission for " + permissionsText,
	},
	{
		status: 403,
		code: "MUST_BE_LOGGED_IN",
		title: "Permission denied",
		detail: "Must be logged in",
	},
];

// @ts-ignore
module.exports = require("@fruster/errors")(errors);
