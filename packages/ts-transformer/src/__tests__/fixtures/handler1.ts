import { Car, subscribe } from "./MockTypes";
import { FrusterRequest, FrusterResponse } from "@fruster/bus";

export class Handler {
  @subscribe({ subject: "foo.bar" })
  async handleAsMethodDeclaration(
    req: FrusterRequest<Car>
  ): Promise<FrusterResponse<Car>> {
    return {
      reqId: "foo",
      status: 200,
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
      status: 200,
      data: 1,
    };
  };
}
