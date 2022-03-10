import { Car, FrusterRequest, FrusterResponse, subscribe } from "./MockTypes";

export class Handler {
  @subscribe({ subject: "foo.bar" })
  async handleAsMethodDeclaration(
    req: FrusterRequest<Car>
  ): Promise<FrusterResponse<Car>> {
    return {
      reqId: "foo",
      data: {
        model: "string",
      },
    };
  }

  @subscribe({ subject: "foo.bar" })
  handleAsPropertyDeclaration = async (
    req: FrusterRequest<Car>
  ): Promise<FrusterResponse<number>> => {
    return {
      reqId: "foo",
      data: 1,
    };
  };
}
