import { FrusterRequest, FrusterResponse } from "@fruster/bus";
import { injectable, subscribe, inject } from "@fruster/decorators";
import { Car } from "../models/Car";
import { CarRepo } from "../repos/CarRepo";
import * as uuid from "uuid";

export interface CreateCarRequest {
  /**
   * Car brand
   * @TJS-type string
   */
  brand: string;
  /**
   * Car model
   * @TJS-type string
   */
  model: string;
}

@injectable()
class CreateCarHandler {
  @inject()
  carRepo!: CarRepo;

  @subscribe({
    subject: "demo-service.create-car",
  })
  async handle(
    req: FrusterRequest<CreateCarRequest>,
  ): Promise<FrusterResponse<Car>> {
    const car = await this.carRepo.create({
      id: uuid.v4(),
      brand: req.data.brand,
      model: req.data.model,
    });

    return {
      status: 201,
      data: {
        id: car.id,
        brand: car.brand,
        model: car.model,
      },
    };
  }
}

export default CreateCarHandler;
