const EngineSchema = require("./EngineSchema");
const specConstants = require("../spec-constants");

module.exports = {
	id: "carPojo",
	properties: {
		id: {
			type: "string",
			format: "uuid"
		},
		brand: {
			type: "string",
			enum: [...specConstants.CAR_TYPES]
		},
		doors: {
			type: "integer",
			maximum: 5 + 24,
			minimum: 3
		},
		created: {
			type: "string",
			format: "date-time"
		},
		engine: {
			type: "object",
			properties: { ...EngineSchema.properties }
		}
	},
	required: [
		"doors",
		"brand"
	]
};
