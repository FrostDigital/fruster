import testUtils from "../";
import bus from "@fruster/bus";

describe("Cleanup helpers", () => {
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
		console.log("Skipping cleanup helpers test - mongodb or mongodb-memory-server not installed or running in CI");
		return;
	}

	describe("dropCollectionsBeforeEach", () => {
		let connection: any;

		const testHelpers = testUtils.startBeforeAll({
			bus,
			useInMemoryMongo: true,
			mockNats: true,
			afterStart: (conn) => {
				connection = conn;
			},
		});

		testHelpers.dropCollectionsBeforeEach();

		it("should have clean database in first test", async () => {
			const collections = await connection.db.listCollections().toArray();
			expect(collections.length).toBe(0);

			// Insert some data
			await connection.db.collection("users").insertOne({ name: "Alice" });
			const count = await connection.db.collection("users").countDocuments();
			expect(count).toBe(1);
		});

		it("should have clean database in second test", async () => {
			// Collections should be dropped from previous test
			const collections = await connection.db.listCollections().toArray();
			expect(collections.length).toBe(0);

			// Insert different data
			await connection.db.collection("products").insertOne({ name: "Widget" });
			const count = await connection.db.collection("products").countDocuments();
			expect(count).toBe(1);
		});
	});

	describe("dropDatabaseBeforeEach", () => {
		let connection: any;

		const testHelpers = testUtils.startBeforeAll({
			bus,
			useInMemoryMongo: true,
			mockNats: true,
			afterStart: (conn) => {
				connection = conn;
			},
		});

		testHelpers.dropDatabaseBeforeEach();

		it("should have clean database in first test", async () => {
			await connection.db.collection("users").insertOne({ name: "Bob" });
			const count = await connection.db.collection("users").countDocuments();
			expect(count).toBe(1);
		});

		it("should have clean database in second test", async () => {
			// Database should be dropped from previous test
			const collections = await connection.db.listCollections().toArray();
			expect(collections.length).toBe(0);
		});
	});

	describe("cleanupBeforeEach with custom logic", () => {
		let connection: any;
		let cleanupCalled = 0;

		const testHelpers = testUtils.startBeforeAll({
			bus,
			useInMemoryMongo: true,
			mockNats: true,
			afterStart: (conn) => {
				connection = conn;
			},
		});

		testHelpers.cleanupBeforeEach(async (conn) => {
			cleanupCalled++;
			// Custom cleanup: only delete specific collection
			await conn.db?.collection("users").deleteMany({});
		});

		it("should call custom cleanup in first test", async () => {
			expect(cleanupCalled).toBe(1);

			await connection.db.collection("users").insertOne({ name: "Charlie" });
			await connection.db.collection("products").insertOne({ name: "Gadget" });

			const userCount = await connection.db.collection("users").countDocuments();
			const productCount = await connection.db.collection("products").countDocuments();

			expect(userCount).toBe(1);
			expect(productCount).toBe(1);
		});

		it("should only clean users collection in second test", async () => {
			expect(cleanupCalled).toBe(2);

			// Users should be cleaned, products should remain
			const userCount = await connection.db.collection("users").countDocuments();
			const productCount = await connection.db.collection("products").countDocuments();

			expect(userCount).toBe(0);
			expect(productCount).toBe(1); // Still has the product from previous test
		});
	});
});
