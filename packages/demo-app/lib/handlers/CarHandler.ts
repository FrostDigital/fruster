import { FrusterRequest, FrusterResponse } from "@fruster/bus";
import { injectable, subscribe } from "@fruster/decorators";
import { Car } from "../models/Car";
import * as uuid from "uuid";

export interface GetCarRequest {
  brand?: string;
}

@injectable()
class CarHandler {
  @subscribe({
    subject: "demo-service.get-car",
  })
  handle(req: FrusterRequest<GetCarRequest>): FrusterResponse<Car> {
    return {
      status: 200,
      data: {
        id: uuid.v4(),
        brand: req.data.brand || "Tesla",
        model: "Model",
      },
    };
  }

  @subscribe({
    subject: "http.get.car",
  })
  handleHttp(
    req: FrusterRequest<
      any,
      any,
      {
        sort: string;
      }
    >
  ): FrusterResponse<Car> {
    return {
      status: 200,
      data: {
        id: uuid.v4(),
        brand: "Tesla",
        model: "Model",
      },
    };
  }
}

export default CarHandler;
