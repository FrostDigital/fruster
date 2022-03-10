interface Car {
  model: string;
  brand: string;
}

interface FrusterRequest<T> {
  data: T;
}

interface FrusterResponse<T> {
  data: T;
}

export class Handler {
  handle(req: FrusterRequest<Car>): FrusterResponse<Car> {
    return {
      data: {
        model: "model 3",
        brand: "Tesla",
      },
    };
  }

  async handle2(req: FrusterRequest<Car>): Promise<FrusterResponse<Car>> {
    return {
      data: {
        model: "model 3",
        brand: "Tesla",
      },
    };
  }

  async handle3(req: FrusterRequest<Car>): Promise<FrusterResponse<number>> {
    return {
      data: 1,
    };
  }
}
