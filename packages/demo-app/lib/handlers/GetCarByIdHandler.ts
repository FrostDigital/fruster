import { errors, FrusterRequest, FrusterResponse } from "@fruster/bus";
import { injectable, subscribe } from "@fruster/decorators";
import { Car } from "../models/Car";
import * as uuid from "uuid";

export interface GetCarByIdRequest {
  brand?: string;
}

@injectable()
class GetCarByIdHandler {
  @subscribe({
    subject: "http.get.car.:id",
  })
  handleHttp({
    params,
  }: FrusterRequest<any, { id: string }>): FrusterResponse<Car> {
    if (params.id === "123") {
      errors.notFound(`Car with id ${params.id} does not exists`);
    }

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

export default GetCarByIdHandler;
