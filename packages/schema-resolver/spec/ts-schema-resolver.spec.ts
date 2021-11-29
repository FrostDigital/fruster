import TypeScriptSchemaResolver, { setSchemaResolverFilePattern } from "..";
import { join } from "path";

describe("SchemaResolver", () => {
	it("should parse schemas from typescript interface", async () => {
		const schemas = TypeScriptSchemaResolver.addSchemas(
			["Foo.ts"],
			join(__dirname, "support")
		);

		// console.log(JSON.stringify(schemas, null, 2));

		expect(schemas.length).toBe(2);

		expect(schemas[0].id).toBe("Foo");
		expect(schemas[0].description).toBe("This is description for Foo");
		expect(schemas[0].required.length).toBe(2);
		expect(schemas[0].additionalProperties).toBe(false);

		expect(schemas[1].id).toBe("Bar");
		expect(schemas[1].description).toBe("This is description for Bar");
		expect(schemas[1].additionalProperties).toBe(true);
	});

	it("should parse schemas from typescript interface", async () => {
		const schemas = TypeScriptSchemaResolver.addSchemas(
			["Foo.ts"],
			join(__dirname, "support")
		);

		expect(schemas.length).toBe(2);

		expect(schemas[0].id).toBe("Foo");
		expect(schemas[0].description).toBe("This is description for Foo");
		expect(schemas[0].required.length).toBe(2);

		expect(schemas[1].id).toBe("Bar");
		expect(schemas[1].description).toBe("This is description for Bar");
	});

	it("should filter", async () => {
		const defaultMatchAll = TypeScriptSchemaResolver.filter("Foo.ts");

		setSchemaResolverFilePattern(/I.*\.ts/);

		const nonMatch = TypeScriptSchemaResolver.filter("Foo.ts");
		const match = TypeScriptSchemaResolver.filter("IFoo.ts");

		expect(defaultMatchAll).toBe(true);
		expect(nonMatch).toBe(false);
		expect(match).toBe(true);

		setSchemaResolverFilePattern(undefined); // revert back to default
	});
});
