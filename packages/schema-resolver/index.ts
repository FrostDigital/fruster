import * as TJS from "typescript-json-schema";
import { resolve, join } from "path";
import * as log from "fruster-log";

const DEFAULT_FILTER = new RegExp(".*");

let fileFilterRegExp = DEFAULT_FILTER;

interface JSONSchemaish {
	id: string;
	additionalProperties?: boolean;
	description?: string;
	properties?: {
		[x: string]: {
			description?: string;
			type: string | string[];
			format?: string | string[];
			[x: string]: any;
		};
	};
	required?: string[];
	[x: string]: any;
}

const TypeScriptSchemaResolver = {
	addSchemas: (filenames: string[], basePath: string) => {
		const schemas: JSONSchemaish[] = [];

		// optionally pass argument to schema generator
		const settings: TJS.PartialArgs = {
			required: true,
			ref: false,
			noExtraProps: true,
		};

		// optionally pass ts compiler options
		const compilerOptions: TJS.CompilerOptions = {
			strictNullChecks: true,
		};

		try {
			const program = TJS.getProgramFromFiles(
				filenames.map((filename) => resolve(join(basePath, filename))),
				compilerOptions
			);

			const schema = TJS.generateSchema(program, "*", settings);

			if (schema?.definitions) {
				for (const definitionName in schema.definitions) {
					schemas.push({
						id: definitionName,
						...(schema.definitions[definitionName] as object),
					});
				}
			}
		} catch (err) {
			log.debug(
				`Failed parsing one ore more of schema(s) ${filenames.join(
					", "
				)}`
			);
			log.silly(err);
		}

		return schemas;
	},
	filter: (filename: string) => {
		return fileFilterRegExp.test(filename);
	},
};

/**
 * Optionally set file filter/pattern for which this schema resolver will be used.
 * Supports string or regexp.
 *
 * Examples:
 *
 * ```
 * setSchemaResolverFilePattern(".*.ts")
 * setSchemaResolverFilePattern(/.*.ts/)
 * ```
 * @param fileFilter
 */
export function setSchemaResolverFilePattern(fileFilter?: string | RegExp) {
	if (typeof fileFilter === "string") {
		fileFilterRegExp = new RegExp(fileFilter);
	} else if (fileFilter instanceof RegExp) {
		fileFilterRegExp = fileFilter;
	} else {
		fileFilterRegExp = DEFAULT_FILTER;
	}
}

export default TypeScriptSchemaResolver;
