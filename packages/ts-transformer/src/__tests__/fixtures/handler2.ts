import { Car, FrusterRequest, FrusterResponse, subscribe } from "./MockTypes";

export class Handler {
  @subscribe({ subject: "foo.bar" })
  async handleInlineTypeLiteral(
    req: FrusterRequest<{ model: string }>
  ): Promise<FrusterResponse<{ model: string }>> {
    return {
      reqId: "foo",
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
      reqId: "foo",
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
      reqId: "foo",
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
      reqId: "foo",
      data: {
        model: "string",
      },
    };
  }
}
