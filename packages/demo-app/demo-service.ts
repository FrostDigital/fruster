import bus from "@fruster/bus";
import GetCarHandler from "./lib/handlers/GetCarHandler";
import "./lib/errors";

export async function start(natsUrl: string) {
  await bus.connect(natsUrl);

  registerHandlers();
}

const registerHandlers = () => {
  new GetCarHandler();
};
