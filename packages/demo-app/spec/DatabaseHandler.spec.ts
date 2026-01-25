import bus from "@fruster/bus";
import { startBeforeAll } from "@fruster/test-utils";

/**
 * Real-world example: Testing database operations with in-memory MongoDB
 *
 * This demonstrates a typical test setup where you:
 * - Use in-memory MongoDB for fast, isolated tests
 * - Seed test data in the beforeAll hook
 * - Clean up database after tests automatically
 * - No need for external MongoDB server
 *
 * Note: First run may take longer as mongodb-memory-server downloads the MongoDB binary (~70-100MB)
 * Subsequent runs will be fast as the binary is cached.
 */
describe("DatabaseHandler with in-memory MongoDB", () => {
	let connection: any;

	// Increase timeout for first-time MongoDB binary download
	jasmine.DEFAULT_TIMEOUT_INTERVAL = 120000; // 2 minutes

	startBeforeAll({
		mockNats: true,
		bus,
		useInMemoryMongo: true, // Use in-memory MongoDB for testing
		dropDatabase: true, // Clean up after tests
		afterStart: async (conn) => {
			connection = conn;

			// Seed some test data
			await connection.db.collection("cars").insertMany([
				{ brand: "Volvo", model: "XC90", year: 2024 },
				{ brand: "Tesla", model: "Model 3", year: 2024 },
				{ brand: "BMW", model: "X5", year: 2023 },
			]);
		},
	});

	it("should connect to in-memory MongoDB", () => {
		expect(connection.db).toBeDefined();
		expect(connection.client).toBeDefined();
		expect(connection.memoryServer).toBeDefined();
	});

	it("should insert and retrieve data from in-memory MongoDB", async () => {
		// Insert a new car
		const result = await connection.db.collection("cars").insertOne({
			brand: "Audi",
			model: "A4",
			year: 2024,
		});

		expect(result.insertedId).toBeDefined();

		// Retrieve the inserted car
		const car = await connection.db.collection("cars").findOne({
			brand: "Audi",
		});

		expect(car).toBeDefined();
		expect(car.brand).toBe("Audi");
		expect(car.model).toBe("A4");
		expect(car.year).toBe(2024);
	});

	it("should query seeded data from in-memory MongoDB", async () => {
		// Find all Volvo cars
		const volvos = await connection.db
			.collection("cars")
			.find({ brand: "Volvo" })
			.toArray();

		expect(volvos.length).toBe(1);
		expect(volvos[0].model).toBe("XC90");
	});

	it("should update data in in-memory MongoDB", async () => {
		// Update the Tesla's year
		await connection.db.collection("cars").updateOne(
			{ brand: "Tesla" },
			{ $set: { year: 2025 } }
		);

		// Verify the update
		const tesla = await connection.db.collection("cars").findOne({
			brand: "Tesla",
		});

		expect(tesla.year).toBe(2025);
	});

	it("should delete data from in-memory MongoDB", async () => {
		// Delete BMW
		const deleteResult = await connection.db.collection("cars").deleteOne({
			brand: "BMW",
		});

		expect(deleteResult.deletedCount).toBe(1);

		// Verify it's gone
		const bmw = await connection.db.collection("cars").findOne({
			brand: "BMW",
		});

		expect(bmw).toBeNull();
	});

	it("should count documents in in-memory MongoDB", async () => {
		const count = await connection.db.collection("cars").countDocuments();

		// Should have: 3 seeded + 1 inserted (Audi) - 1 deleted (BMW) = 3
		expect(count).toBe(3);
	});

	it("should support aggregation in in-memory MongoDB", async () => {
		// Group cars by year
		const pipeline = [
			{
				$group: {
					_id: "$year",
					count: { $sum: 1 },
					brands: { $push: "$brand" },
				},
			},
			{ $sort: { _id: -1 } },
		];

		const result = await connection.db
			.collection("cars")
			.aggregate(pipeline)
			.toArray();

		expect(result.length).toBeGreaterThan(0);
		expect(result[0]._id).toBeDefined();
		expect(result[0].count).toBeDefined();
		expect(result[0].brands).toBeDefined();
	});
});
