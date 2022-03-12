import { FrusterRequest, FrusterResponse } from "@fruster/bus";
import { Car, subscribe } from "./MockTypes";
export class Handler {
  @subscribe({ subject: "foo.bar" })
  async handleInlineTypeLiteral(
    req: FrusterRequest<{ model: string }>
  ): Promise<FrusterResponse<{ model: string }>> {
    return {
      status: 200,
      data: {
        model: "string",
      },
    };
  }

  @subscribe({ subject: "foo.bar" })
  async handleArrayInline(
    req: FrusterRequest<{ model: string }[]>
  ): Promise<FrusterResponse<{ model: string }[]>> {
    return {
      status: 200,
      data: [
        {
          model: "string",
        },
      ],
    };
  }

  @subscribe({ subject: "foo.bar" })
  async handleArray(
    req: FrusterRequest<Car[]>
  ): Promise<FrusterResponse<Car[]>> {
    return {
      status: 200,
      data: [
        {
          model: "string",
        },
      ],
    };
  }

  @subscribe({ subject: "foo.bar" })
  async handleUtilType(
    req: FrusterRequest<Omit<Car, "brand">>
  ): Promise<FrusterResponse<Pick<Car, "model">>> {
    return {
      status: 200,
      data: {
        model: "string",
      },
    };
  }
}
