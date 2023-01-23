import { FrusterRequest, FrusterResponse } from "@fruster/bus";
import { subscribe } from "./MockTypes";

type Query = {
  /**
   * Name of car
   */
  name: string;
};

export class Handler {
  @subscribe({ subject: "http.get.car" })
  async handleWithQuery(
    req: FrusterRequest<any, any, Query>
  ): Promise<FrusterResponse<{ model: string }>> {
    return {
      status: 200,
      data: {
        model: "string",
      },
    };
  }

  @subscribe({ subject: "http.get.car.:id" })
  async handleWithParam(
    req: FrusterRequest<any, { id: string }>
  ): Promise<FrusterResponse<any>> {
    return {
      status: 200,
      data: "Hello world",
    };
  }

  @subscribe({ subject: "http.get.car.:id" })
  async handleWithParamAndQuery(
    req: FrusterRequest<any, { id: string }, { foo?: string }>
  ): Promise<FrusterResponse<any>> {
    return {
      status: 200,
      data: "Hello world",
    };
  }

  @subscribe({
    subject: "http.get.car.:id",
    docs: {
      params: {
        id: "This should not be overwritten",
      },
    },
  })
  async handleWithParamButUseExistingQueryDocs(
    req: FrusterRequest<any, { id: string }, { foo: string }>
  ): Promise<FrusterResponse<any>> {
    return {
      status: 200,
      data: "Hello world",
    };
  }
}
