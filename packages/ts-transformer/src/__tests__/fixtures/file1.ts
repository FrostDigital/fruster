import { FrusterRequest, FrusterResponse } from "@fruster/bus";

interface Car {
  model: string;
  brand: string;
}

type Query = {
  foo: string;
};

export class Handler {
  handle(
    req: FrusterRequest<Car, { id: string }, Query>
  ): FrusterResponse<Car> {
    return {
      status: 200,
      data: {
        model: "model 3",
        brand: "Tesla",
      },
    };
  }

  async handle2(req: FrusterRequest<Car>): Promise<FrusterResponse<Car>> {
    return {
      status: 200,
      data: {
        model: "model 3",
        brand: "Tesla",
      },
    };
  }

  async handle3(req: FrusterRequest<Car>): Promise<FrusterResponse<number>> {
    return {
      status: 200,
      data: 1,
    };
  }
}
