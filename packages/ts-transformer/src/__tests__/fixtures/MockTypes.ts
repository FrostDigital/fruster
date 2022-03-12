export interface Car {
  model: string;
  brand?: string;
}

export function subscribe(args: {
  subject: string;
  requestSchema?: any;
  responseSchema?: any;
  docs?: {
    query?: { [x: string]: string };
    params?: { [x: string]: string };
  };
}): any {}
