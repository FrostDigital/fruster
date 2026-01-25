import testUtils from "../";
import bus from "@fruster/bus";

class FakeService {
	count = 0;
	invokedThen = false;

	start() {
		this.count++;
		return Promise.resolve();
	}
}

describe("Before jasmine test convenient method", () => {
	describe("beforeEach", () => {
		let service = new FakeService();

		testUtils.startBeforeEach({
			service: service,
			bus,
			mockNats: true,
			afterStart: (connection) => {
				service.invokedThen = true;
				expect(connection).toBeDefined();
				expect(connection.bus).toBe(bus);
			},
		});

		it("should run once", () => {
			expect(service.count).toBe(1);
		});

		it("should run twice", () => {
			expect(service.count).toBe(2);
		});

		it("should invoke then", () => {
			expect(service.invokedThen).toBeTruthy();
		});
	});

	describe("beforeAll", () => {
		let service = new FakeService();

		testUtils.startBeforeAll({
			service: service,
			bus: bus,
			mockNats: true,
		});

		it("should run once", () => {
			expect(service.count).toBe(1);
		});

		it("should still run once", () => {
			expect(service.count).toBe(1);
		});
	});

	describe("beforeAll with mongo db", () => {
		let mongoDbAvailable = false;
		try {
			require.resolve("mongodb");
			mongoDbAvailable = true;
		} catch (e) {
			// MongoDB not installed
		}

		if (!mongoDbAvailable || process.env.CI) {
			console.log("Skipping MongoDB test - mongodb not installed or running in CI");
			return;
		}

		let service = new FakeService();

		testUtils.startBeforeAll({
			service: service,
			bus: bus,
			mongoUrl: "mongodb://localhost:27017/test-utils-test",
			mockNats: true,
			afterStart: (connection) => {
				// create a collection to verify MongoDB connection works
				return connection.db?.collection("foo").insertOne({ id: "hello" });
			},
			beforeStop: (connection) => {
				console.log("invoking beforeStop()");
				expect(connection).toBeDefined();
			},
		});

		it("should run once", () => {
			expect(service.count).toBe(1);
		});
	});

});
