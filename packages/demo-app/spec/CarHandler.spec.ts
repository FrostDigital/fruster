import bus, { testBus } from "@fruster/bus";
import { startBeforeAll } from "@fruster/test-utils";
import { start } from "../demo-service";
import { GetCarRequest } from "../lib/handlers/GetCarHandler";
import { Car } from "../lib/models/Car";

describe("CarHandler", () => {
  startBeforeAll({
    mockNats: true,
    bus,
    service: (conn) => start(conn.natsUrl),
  });

  it("should get car", async () => {
    const { status, data } = await testBus.request<GetCarRequest, Car>({
      subject: "demo-service.get-car",
      message: {
        data: {
          brand: "Volvo",
        },
      },
    });

    expect(status).toBe(200);
    expect(data.brand).toBe("Volvo");
  });

  it("should get car but fail request schema validation", async () => {
    const { status, data } = await testBus.request<any, Car>({
      subject: "demo-service.get-car",
      message: {
        data: {
          brand: 111,
        },
      },
      throwErrors: false,
    });

    expect(status).toBe(400);
  });
});
