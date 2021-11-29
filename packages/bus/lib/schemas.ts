import Ajv, { AdditionalPropertiesParams, Ajv as AjvType } from "ajv";
import fs from "fs-extra";
import path from "path";
import crypto from "crypto";
import utils from "./util/utils";
import conf from "../conf";

const errors = require("./util/errors");

// export const schemas = {};
let parsedSchemas: any = [];
let validator: AjvType;
let customSchemaResolver: any = null;

/**
 * Read all schemas in schemas dir, compile and add them
 * to the validator (ajv).
 */
export const init = (schemasPath: string, schemaResolver: any, disableSchemaCache = conf.disableSchemaCache) => {
	customSchemaResolver = schemaResolver;

	if (!parsedSchemas.length || disableSchemaCache) {
		parsedSchemas = [];
		validator = new Ajv({ missingRefs: "fail" });

		let fullSchemasDirPath = path.join(process.cwd(), schemasPath);

		if (!fs.existsSync(fullSchemasDirPath)) {
			fullSchemasDirPath = path.join(process.cwd(), "/schemas"); // For old schemas directory

			if (!fs.existsSync(fullSchemasDirPath)) {
				// log.warn(`Schema dir ${fullSchemasDirPath} does not exist`);
				console.warn(`Schema dir ${fullSchemasDirPath} does not exist`);
				return;
			}
		}

		const files = fs.readdirSync(fullSchemasDirPath);

		addSchema({ schemaFiles: files, schemaDir: fullSchemasDirPath });
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
function getErrorMessage(validator: AjvType) {
	if (
		validator.errorsText().includes("data should NOT have additional properties") &&
		validator.errors &&
		validator.errors[0]
	) {
		try {
			const errorParams = validator.errors[0].params as AdditionalPropertiesParams;
			return `${validator.errors[0].message}: ${errorParams.additionalProperty}`;
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

/**
 * @typedef {Object} AddSchemaOpts
 *
 * @property {Object?} schema
 * @property {string[]?} schemaFiles
 * @property {string?} schemaDir
 */

/**
 *
 * @param {AddSchemaOpts} opts
 */
export const addSchema = ({
	schema,
	schemaFiles = [],
	schemaDir,
}: {
	schema?: any;
	schemaFiles?: string[];
	schemaDir?: string;
}) => {
	let schemas = [];

	// Divide schemaFiles into those resolved as regular json schema and those that
	// should be resolved by custom schema resolver (if any)
	const { jsonSchemas, customSchemaResolverSchemas } = schemaFiles.reduce<{
		customSchemaResolverSchemas: string[];
		jsonSchemas: string[];
	}>(
		(acc, filename) => {
			if (filename.includes(".json")) {
				acc.jsonSchemas.push(filename);
			} else if (resolveWithCustomSchemaResolver(filename)) {
				acc.customSchemaResolverSchemas.push(filename);
			}
			return acc;
		},
		{ customSchemaResolverSchemas: [], jsonSchemas: [] }
	);

	if (customSchemaResolverSchemas.length) {
		const schemasParsedByCustomSchemaResolver =
			customSchemaResolver.addSchemas(customSchemaResolverSchemas, schemaDir) || [];

		if (schemasParsedByCustomSchemaResolver.length) {
			// log.silly(
			// 	`Schema(s) in ${schemasParsedByCustomSchemaResolver.join(", ")} was added by custom schema resolver`
			// );
			schemas = schemasParsedByCustomSchemaResolver;
		} else {
			// log.silly(
			// 	`Schema(s) in ${schemasParsedByCustomSchemaResolver.join(
			// 		", "
			// 	)} could not be parsed by custom schema resolver`
			// );
		}
	}

	if (jsonSchemas.length && schemaDir) {
		schemas = [...schemas, ...jsonSchemas.map((schemaFile) => fs.readJsonSync(path.join(schemaDir, schemaFile)))];
	}

	if (schema) {
		// Note: Schema objects are never referenced by id, so we can safely generate a hash
		schema.id = hashSchema({ ...schema, id: null });
		schemas = [...schemas, schema];
	}

	if (!schemas.length) {
		throw new Error("Should provide either `schemaFiles` or `schema` object");
	}

	for (const schema of schemas) {
		try {
			if (schema.id && validator.getSchema(schema.id)) {
				// log.silly(`Schema ${schema.id} already exists`);
			} else {
				const schemaIdentifier = schema.id;

				if (!schema.id) {
					console.error("Missing id for schema", JSON.stringify(schema));
					continue;
				}

				// log.silly(`Adding ${schemaIdentifier}`);

				// Add schema to validator instance
				validator.addSchema(schema);

				// Also add schema to make it available to meta data handler
				parsedSchemas.push(schema);
			}
		} catch (err) {
			console.error(`Invalid schema ${JSON.stringify(schema)}`, err);
			throw err;
		}
	}
};

function hashSchema(object: any) {
	return crypto
		.createHash("md5")
		.update(JSON.stringify(object || {}))
		.digest("hex");
}

function resolveWithCustomSchemaResolver(file: string) {
	return (
		(customSchemaResolver && !customSchemaResolver.filter) ||
		(customSchemaResolver && customSchemaResolver.filter(file))
	);
}
