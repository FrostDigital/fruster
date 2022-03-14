import { buildErrors } from "../../lib/errors/index";

const exampleErrors = [
	{
		status: 400,
		code: "INVALID_PRESIDENT",
		title: "This is wrong",
		detail: (president: string, actualPresident: string) =>
			`I was hoping for ${president}, but ${actualPresident} was elected`,
	},

	{
		status: 500,
		code: "INTERNAL_SERVER_ERROR",
		title: "Something broke",
	},
];

export default buildErrors(exampleErrors);
