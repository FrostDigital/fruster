import { FrusterRequest, FrusterResponse } from "@fruster/bus";
import { injectable, subscribe, inject } from "@fruster/decorators";
import { Car } from "../models/Car";
import { CarRepo } from "../repos/CarRepo";

export interface GetCarRequest {
  /**
   * Car ID to retrieve
   * @TJS-type string
   */
  id: string;
}

@injectable()
class GetCarHandler {
  @inject()
  carRepo?: CarRepo;

  @subscribe({
    subject: "demo-service.get-car",
  })
  async handle(req: FrusterRequest<GetCarRequest>): Promise<FrusterResponse<Car>> {
    if (!this.carRepo) {
      return {
        status: 500,
        data: {
          id: "",
          brand: "",
          model: "",
        },
      };
    }

    const car = await this.carRepo.findById(req.data.id);

    if (!car) {
      return {
        status: 404,
        data: {
          id: "",
          brand: "",
          model: "",
        },
      };
    }

    return {
      status: 200,
      data: car,
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
    // HTTP handler kept simple for demo purposes
    return {
      status: 200,
      data: {
        id: "http-example",
        brand: "Tesla",
        model: "Model",
      },
    };
  }
}

export default GetCarHandler;
