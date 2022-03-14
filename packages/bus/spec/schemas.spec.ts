import * as schemas from "../lib/schemas";

describe("Schemas", () => {
	beforeEach(() => {
		schemas.init("spec/support/test-schemas", false);
	});

	it("should init with schemas in given dir", () => {
		expect(schemas.getSchema("car")).toBeDefined();
	});

	it("should validate object against schema", () => {
		const validCar = {
			doors: 5,
			brand: "volvo",
			created: new Date(),
		};

		expect(schemas.validate("car", validCar)).toBeTruthy();
	});

	it("should fail to validate object against schema", () => {
		const invalidCar = {
			doors: 5,
			brand: "yamaha", // <-- invalid
		};

		try {
			schemas.validate("car", invalidCar);
		} catch (err: any) {
			expect(err.status).toBe(400);
			expect(err.error.code).toBe("BAD_REQUEST");
			expect(err.error.id).toBeDefined();
			expect(err.error.detail).toMatch("brand");
		}
	});

	it("should fail to validate object against schema with additional properties false", () => {
		const invalidCar = {
			doors: 5,
		};

		try {
			schemas.validate("car-additional-properties", invalidCar);
		} catch (err: any) {
			expect(err.status).toBe(400);
			expect(err.error.code).toBe("BAD_REQUEST");
			expect(err.error.id).toBeDefined();
			expect(err.error.detail).toMatch("doors");
		}
	});

	it("should fail if schema does not exist", () => {
		try {
			schemas.validate("non existing schema", {});
		} catch (err: any) {
			expect(err.status).toBe(500);
			expect(err.error.code).toBe("INTERNAL_SERVER_ERROR");
		}
	});
});
