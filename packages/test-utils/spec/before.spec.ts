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
		if (!process.env.CI) {
			console.log(
				"Skipping test that requires mongodb unless CI=1 is set"
			);
			return;
		}

		let service = new FakeService();

		testUtils.startBeforeAll({
			service: service,
			bus: bus,
			mongoUrl: "mongodb://localhost:27017/test-utils-test",
			mockNats: true,
			afterStart: (connection) => {
				// create a collection and see if it removes
				return connection.db
					?.collection("foo")
					.insert({ _id: "hello" });
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
