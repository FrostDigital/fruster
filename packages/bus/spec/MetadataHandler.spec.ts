import { startNatsServerAndConnectBus, TestConnection } from "./support/test-utils";
import bus from "../index";
import constants from "../constants";
const conf = require("../conf");

describe("MetadataHandler", () => {
	let natsConnection: TestConnection;

	beforeAll((done) => {
		conf.disableSchemaCache = true;

		startNatsServerAndConnectBus(undefined, "/spec/support/test-schemas")
			.then((connection) => {
				natsConnection = connection;
				done();
			})
			.catch(done.fail);
	});

	afterAll(() => {
		natsConnection.server.kill();
		bus.closeAll();
	});

	it("should return all exposes subscribes", (done) => {
		const docs = {
			description: "This is an endpoint",
			query: {
				search: "search query",
			},
			params: {
				userId: "the id of a user as param",
			},
			errors: {
				INVALID_TOKEN: "Provided token is invalid",
			},
		};

		bus.subscribe(
			{
				subject: "car-service.:brand",
				requestSchema: "carSchema",
				responseSchema: "",
				permissions: ["user.*"],
				deprecated: true,
				docs,
			},
			(req) => {
				return {};
			}
		);

		bus.subscribe(
			{
				subject: "car-service.tesla",
				requestSchema: {
					id: "teslaSchema",
					properties: { id: { type: "string" } },
				},
				responseSchema: "",
				permissions: ["user.*"],
				deprecated: true,
				docs,
			},
			(_req) => {
				return {};
			}
		);

		bus.subscribe(
			{
				subject: "car-service.:brand.:model",
				requestSchema: "carModelSchema",
				responseSchema: "",
				permissions: ["user.*"],
				deprecated: true,
				docs,
			},
			(_req) => {
				return {};
			}
		);

		bus.requestMany({
			subject: constants.METADATA_SUBJECT,
			message: {
				reqId: "reqId",
			},
			maxResponses: 100,
			timeout: 100,
		}).then((responses) => {
			const resp = responses[0];

			expect(resp.data.exposing.length).toBe(3);

			expect(resp.data.exposing[0].subject).toBe("car-service.:brand");
			expect(resp.data.exposing[0].docs.description).toBe(docs.description);
			expect(resp.data.exposing[0].docs.query.search).toBe(docs.query.search);
			expect(resp.data.exposing[0].docs.params.userId).toBe(docs.params.userId);
			expect(resp.data.exposing[0].docs.errors.INVALID_TOKEN).toBe(docs.errors.INVALID_TOKEN);
			expect(resp.data.exposing[0].deprecated).toBeTruthy();
			expect(resp.data.schemas.length).toBe(4);

			expect(resp.data.exposing[1].subject).toBe("car-service.tesla");
			// expect(resp.data.exposing[1].requestSchema).toBe("teslaSchema");
			// expect(resp.data.schemas.find(schema => schema.id === "teslaSchema")).toBeDefined("teslaSchema schema should be included in schemas");

			expect(resp.data.exposing[2].subject).toBe("car-service.:brand.:model");
			expect(resp.data.exposing[2].requestSchema).toBe("carModelSchema");

			expect(resp.data.sourceVersion).toBeDefined();

			done();
		});
	});
});
