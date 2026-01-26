import testUtils from "../";
import bus from "@fruster/bus";

describe("Reusable in-memory MongoDB", () => {
	// Check if MongoDB dependencies are available
	let mongoDbAvailable = false;
	let mongoMemoryServerAvailable = false;

	try {
		require.resolve("mongodb");
		mongoDbAvailable = true;
	} catch (e) {
		// MongoDB not installed
	}

	try {
		require.resolve("mongodb-memory-server");
		mongoMemoryServerAvailable = true;
	} catch (e) {
		// mongodb-memory-server not installed
	}

	if (!mongoDbAvailable || !mongoMemoryServerAvailable || process.env.CI) {
		console.log(
			"Skipping reusable MongoDB test - mongodb or mongodb-memory-server not installed or running in CI",
		);
		return;
	}

	// Store the MongoDB URI from first suite
	let firstMongoUri: string;

	describe("First test suite with reusable MongoDB", () => {
		const helpers = testUtils.startBeforeAll({
			bus,
			useInMemoryMongo: true,
			reuseInMemoryMongo: true, // Enable reuse
			mockNats: true,
		});

		// REQUIRED: Use cleanup helpers when reusing MongoDB
		helpers.dropCollectionsBeforeEach();

		it("should start in-memory MongoDB", () => {
			const connection = helpers.connection();
			expect(connection.memoryServer).toBeDefined();
			expect(connection.db).toBeDefined();

			// Store the URI for comparison
			firstMongoUri = connection.memoryServer!.getUri();
		});

		it("should insert and query data", async () => {
			const connection = helpers.connection();
			await connection.db!.collection("users").insertOne({
				name: "Alice",
			});

			const count = await connection.db!
				.collection("users")
				.countDocuments();
			expect(count).toBe(1);
		});

		it("should have clean database after dropCollectionsBeforeEach", async () => {
			const connection = helpers.connection();
			// Collections should be dropped from previous test
			const collections = await connection.db!
				.listCollections()
				.toArray();
			expect(collections.length).toBe(0);
		});
	});

	describe("Second test suite with reusable MongoDB", () => {
		const helpers = testUtils.startBeforeAll({
			bus,
			useInMemoryMongo: true,
			reuseInMemoryMongo: true, // Enable reuse - should get same server
			mockNats: true,
		});

		// REQUIRED: Use cleanup helpers when reusing MongoDB
		helpers.dropCollectionsBeforeEach();

		it("should reuse the same MongoDB instance", () => {
			const connection = helpers.connection();
			expect(connection.memoryServer).toBeDefined();

			// Should be the same URI as the first suite
			const secondMongoUri = connection.memoryServer!.getUri();
			expect(secondMongoUri).toBe(firstMongoUri);
		});

		it("should have clean database (no data from first suite)", async () => {
			const connection = helpers.connection();
			// Should start with clean database
			const collections = await connection.db!
				.listCollections()
				.toArray();
			expect(collections.length).toBe(0);

			// Can insert new data
			await connection.db!.collection("products").insertOne({
				name: "Widget",
			});
			const count = await connection.db!
				.collection("products")
				.countDocuments();
			expect(count).toBe(1);
		});
	});

	describe("Third test suite WITHOUT reuse", () => {
		const helpers = testUtils.startBeforeAll({
			bus,
			useInMemoryMongo: true,
			reuseInMemoryMongo: false, // Don't reuse
			mockNats: true,
		});

		it("should get a different MongoDB instance", () => {
			const connection = helpers.connection();
			expect(connection.memoryServer).toBeDefined();

			// Should be a different URI
			const thirdMongoUri = connection.memoryServer!.getUri();
			expect(thirdMongoUri).not.toBe(firstMongoUri);
		});
	});
});
