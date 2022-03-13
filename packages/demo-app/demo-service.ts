import bus from "@fruster/bus";
import CarHandler from "./lib/handlers/CarHandler";
import "./lib/errors";

export async function start(natsUrl: string) {
  await bus.connect(natsUrl);

  registerHandlers();
}

const registerHandlers = () => {
  new CarHandler();
};
