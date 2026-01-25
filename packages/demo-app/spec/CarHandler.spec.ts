import bus, { testBus } from "@fruster/bus";
import { startBeforeAll } from "@fruster/test-utils";
import { start } from "../demo-service";
import { GetCarRequest } from "../lib/handlers/GetCarHandler";
import { CreateCarRequest } from "../lib/handlers/CreateCarHandler";
import { Car } from "../lib/models/Car";
import * as uuid from "uuid";

/**
 * Real-world example: Testing handlers that interact with MongoDB
 *
 * This demonstrates how to:
 * - Use in-memory MongoDB for fast, isolated tests
 * - Start service once with startBeforeAll for speed
 * - Clean database between tests with dropCollectionsBeforeEach
 * - Seed test data before each test for isolation
 * - Test actual CRUD operations through handlers
 * - Verify 404 responses when data doesn't exist
 */
describe("CarHandler", () => {
  let connection: any;
  let volvoId: string;
  let teslaId: string;
  let bmwId: string;

  // Increase timeout for first-time MongoDB binary download
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 120000;

  const testHelpers = startBeforeAll({
    mockNats: true,
    bus,
    useInMemoryMongo: true, // Use in-memory MongoDB
    service: (conn) => {
      connection = conn;
      return start(conn.natsUrl, conn.memoryServer?.getUri());
    },
  });

  // Clean database between tests for isolation
  testHelpers.dropCollectionsBeforeEach();

  beforeEach(async () => {
    // Seed test data with proper UUIDs before each test
    volvoId = uuid.v4();
    teslaId = uuid.v4();
    bmwId = uuid.v4();

    await connection.db?.collection("cars").insertMany([
      { id: volvoId, brand: "Volvo", model: "XC90" },
      { id: teslaId, brand: "Tesla", model: "Model 3" },
      { id: bmwId, brand: "BMW", model: "X5" },
    ]);
  });

  it("should get car by id from database", async () => {
    const { status, data } = await testBus.request<GetCarRequest, Car>({
      subject: "demo-service.get-car",
      message: {
        data: {
          id: volvoId,
        },
      },
    });

    expect(status).toBe(200);
    expect(data.id).toBe(volvoId);
    expect(data.brand).toBe("Volvo");
    expect(data.model).toBe("XC90");
  });

  it("should return 404 when car not found", async () => {
    const { status } = await testBus.request<GetCarRequest, Car>({
      subject: "demo-service.get-car",
      message: {
        data: {
          id: "non-existent-id",
        },
      },
      throwErrors: false,
    });

    expect(status).toBe(404);
  });

  it("should create a new car in database", async () => {
    const { status, data } = await testBus.request<CreateCarRequest, Car>({
      subject: "demo-service.create-car",
      message: {
        data: {
          brand: "Audi",
          model: "A4",
        },
      },
    });

    expect(status).toBe(201);
    expect(data.id).toBeDefined();
    expect(data.brand).toBe("Audi");
    expect(data.model).toBe("A4");

    // Verify it was actually saved in the database
    const savedCar = await connection.db.collection("cars").findOne({ id: data.id });
    expect(savedCar).toBeDefined();
    expect(savedCar.brand).toBe("Audi");
  });

  it("should retrieve created car by id", async () => {
    // First, create a car
    const createResponse = await testBus.request<CreateCarRequest, Car>({
      subject: "demo-service.create-car",
      message: {
        data: {
          brand: "Mercedes",
          model: "C-Class",
        },
      },
    });

    const carId = createResponse.data.id;

    // Then, retrieve it
    const { status, data } = await testBus.request<GetCarRequest, Car>({
      subject: "demo-service.get-car",
      message: {
        data: {
          id: carId,
        },
      },
    });

    expect(status).toBe(200);
    expect(data.id).toBe(carId);
    expect(data.brand).toBe("Mercedes");
    expect(data.model).toBe("C-Class");
  });
});
