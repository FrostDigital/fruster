import exampleErrors from "./support/example";
import { buildErrors } from "../lib/errors";
import { ErrorModel } from "../lib/errors/ErrorModel";

describe("Fruster error", () => {
	it("should create errors", () => {
		const error = exampleErrors.get("INVALID_PRESIDENT", "Bernie", "Trump");

		expect(error.status).toBe(400);
		expect(error.error.code).toBe("INVALID_PRESIDENT");
		expect(error.error.title).toBe("This is wrong");
		expect(error.error.detail).toBe("I was hoping for Bernie, but Trump was elected");

		const oError = exampleErrors.get("INVALID_PRESIDENT", "Hillary", "Trump");

		expect(oError.error.detail).toBe("I was hoping for Hillary, but Trump was elected");
		expect(oError.error.id).not.toBe(error.error.id);
	});

	it("should not fail to create details even though not all args was passed in", () => {
		const error = exampleErrors.get("INVALID_PRESIDENT", "Bernie");
		expect(error.error.detail).toBe("I was hoping for Bernie, but undefined was elected");
	});

	it("should fail to get error that does not exist", () => {
		try {
			exampleErrors.get("POOP");
		} catch (e) {
			expect(e).toMatch("not defined");
		}
	});

	it("should return stringified object from toString", () => {
		const error = exampleErrors.badRequest();
		expect(error.toString()).toBe(
			`{"status":400,"error":{"code":"BAD_REQUEST","title":"Bad request","detail":"","id":"${error.error.id}"}}`
		);
	});

	it("should fail to define error that already exist", () => {
		const errors: ErrorModel[] = [
			{
				status: 400,
				code: "DUPLICATE",
				title: "Foo",
				detail: (president: string) => `I was hoping for ${president}`,
			},
			{
				status: 500,
				code: "DUPLICATE",
				title: "Bar",
			},
		];

		try {
			buildErrors(errors);
		} catch (e) {
			expect(e).toMatch("already defined");
		}
	});

	it("should pass detail params as varargs", (done) => {
		// get
		const gottenError = exampleErrors.get("INVALID_PRESIDENT", "Bernie", "Trump");
		expect(gottenError.error.detail).toBe("I was hoping for Bernie, but Trump was elected");

		// reject
		exampleErrors.reject("INVALID_PRESIDENT", "Hillary", "Trump").catch((rejectedError) => {
			expect(rejectedError.error.detail).toBe("I was hoping for Hillary, but Trump was elected");
			done();
		});
	});

	it("should have added default errors that does not already exist in error model", () => {
		expect(Object.keys(exampleErrors.errors).length).toBe(6);
		expect(exampleErrors.internalServerError().error.title).toBe("Something broke");
	});

	it("should create default errors", () => {
		const errors = buildErrors([]);

		expect(Object.keys(errors.errors).length).toBe(5);

		const badRequest = errors.badRequest("details");
		expect(badRequest.status).toBe(400);
		expect(badRequest.error.code).toBe("BAD_REQUEST");
		expect(badRequest.error.title).toBe("Bad request");
		expect(badRequest.error.detail).toBe("details");

		const unauthorized = errors.unauthorized("details");
		expect(unauthorized.status).toBe(401);
		expect(unauthorized.error.code).toBe("UNAUTHORIZED");
		expect(unauthorized.error.title).toBe("Invalid or missing credentials");
		expect(unauthorized.error.detail).toBe("details");

		const forbidden = errors.forbidden("details");
		expect(forbidden.status).toBe(403);
		expect(forbidden.error.code).toBe("FORBIDDEN");
		expect(forbidden.error.title).toBe("Not allowed to access resource");
		expect(forbidden.error.detail).toBe("details");

		const notFound = errors.notFound("details");
		expect(notFound.status).toBe(404);
		expect(notFound.error.code).toBe("NOT_FOUND");
		expect(notFound.error.title).toBe("Resource was not found");
		expect(notFound.error.detail).toBe("details");

		const internalServerError = errors.internalServerError("details");
		expect(internalServerError.status).toBe(500);
		expect(internalServerError.error.code).toBe("INTERNAL_SERVER_ERROR");
		expect(internalServerError.error.title).toBe("Server encountered an unexpected error");
		expect(internalServerError.error.detail).toBe("details");
	});
});
