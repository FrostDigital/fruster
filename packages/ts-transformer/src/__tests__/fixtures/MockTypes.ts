export interface Car {
  model: string;
  brand?: string;
}

export function subscribe(args: {
  subject: string;
  requestSchema?: any;
  responseSchema?: any;
}): any {}

export interface FrusterRequest<T> {
  reqId: string;
  data: T;
}

export interface FrusterResponse<T> {
  reqId: string;
  data: T;
}
