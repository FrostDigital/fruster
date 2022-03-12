import Ajv from "ajv";
import addFormats from "ajv-formats";
import fs from "fs-extra";
import path from "path";
import conf from "../conf";
import utils, { debugLog, hashSchema } from "./util/utils";

const errors = require("./util/errors");

// export const schemas = {};
let parsedSchemas: any = [];
let validator: Ajv;

/**
 * Read all schemas in schemas dir, compile and add them
 * to the validator (ajv).
 */
export const init = (schemasPath: string, disableSchemaCache = conf.disableSchemaCache) => {
	if (!parsedSchemas.length || disableSchemaCache) {
		parsedSchemas = [];
		validator = new Ajv({
			strict: false,
		});

		addFormats(validator);

		let fullSchemasDirPath = path.join(process.cwd(), schemasPath);

		if (!fs.existsSync(fullSchemasDirPath)) {
			fullSchemasDirPath = path.join(process.cwd(), "/schemas"); // For old schemas directory

			if (!fs.existsSync(fullSchemasDirPath)) {
				return;
			}
		}

		const files = fs.readdirSync(fullSchemasDirPath);

		addSchema({ schemasFromFolder: { files, schemasPath: fullSchemasDirPath } });
	}
};

/**
 * Validates given object to schema with given id.
 *
 * Will throw error BAD_REQUEST or BAD_RESPONSE depending on if
 * object to validate is a request or response.
 *
 * @param {String} schemaId
 * @param {Object} objectToValidate
 * @param {Boolean} isRequest, false indicates that object to validate is response
 *
 * @return {Boolean} true if valid, otherwise error is thrown
 */
export const validate = (schemaId: string, objectToValidate: any, isRequest = true) => {
	let valid;

	try {
		// normalize object so any nested complex objects (such as dates) are serialized into a string
		valid = validator.validate(schemaId, utils.normalizeJSON(objectToValidate || {}));
	} catch (err: any) {
		console.error(
			`Failed validating using schema "${schemaId}", most likely schema is missing or faulty/malformed`,
			err
		);
		throw errors.internalServerError(err.message);
	}

	if (!valid) {
		if (isRequest) throw errors.get("BAD_REQUEST", getErrorMessage(validator));
		else throw errors.get("BAD_RESPONSE", getErrorMessage(validator));
	}

	return true;
};

/**
 * @param {Object} validator
 */
function getErrorMessage(validator: Ajv) {
	const [firstError] = validator.errors || [];

	if (firstError && firstError.keyword === "additionalProperties") {
		try {
			const errorParams = firstError.params;
			return `${firstError.message}: ${errorParams.additionalProperty}`;
			// This will result in a `data should NOT have additional properties: doors` error
		} catch (err) {
			// If something goes wrong above just return the errorsText.
			// log.debug(err);
		}
	}

	return validator.errorsText();
}

/**
 * Get schema by its id. It needs to previously have
 * been added during init.
 *
 * @param  {String} schemaId
 *
 * @return {Object} the schema
 */
export const getSchema = (schemaId: string) => {
	return validator.getSchema(schemaId);
};

/**
 * Get all schemas in schemas dir
 *
 * @return {Object[]} [description]
 */
export const get = () => {
	return parsedSchemas;
};

export const addSchema = ({
	schema,
	schemasFromFolder,
}: {
	schema?: any;
	schemasFromFolder?: {
		files: string[];
		schemasPath: string;
	};
}) => {
	let schemas: any = [];

	if (schemasFromFolder) {
		// Read .json files at this point, not that any other .js or .ts files
		// are read as any other imported source file no need to handle those
		const jsonSchemaFiles = schemasFromFolder.files.filter((f) => f.includes(".json"));
		schemas = [
			...schemas,
			...jsonSchemaFiles.map((schemaFile) =>
				fs.readJsonSync(path.join(schemasFromFolder.schemasPath, schemaFile))
			),
		];
	} else if (schema) {
		delete schema.id; // Remove in case legacy id is set
		// Hash schema object and use that as unique id
		schema.$id = hashSchema({ ...schema, $id: null });
		schemas = [...schemas, schema];
	}

	for (const schema of schemas) {
		if (schema.id && !schema.$id) {
			// Patch schemas that are using old syntax with id instead of $id
			console.warn(
				"Schema has 'id' defined but according to spec '$id' should be used, consider renaming your schema"
			);
			schema.$id = schema.id;
			delete schema.id;
		}

		try {
			if (schema.$id && validator.getSchema(schema.$id)) {
				debugLog(`Schema ${schema.$id} already exists in schema cache, will not add it again`);
			} else {
				if (!schema.$id) {
					console.error("Missing $id for schema, cannot use it:", JSON.stringify(schema));
					continue;
				}

				// Add schema to validator instance
				validator.addSchema(schema);

				debugLog(`Added ${schema.$id}`);

				// Also add schema to make it available to meta data handler
				parsedSchemas.push(schema);
			}
		} catch (err) {
			console.error(`Invalid schema ${JSON.stringify(schema)}`, err);
			throw err;
		}
	}
};
