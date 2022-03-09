import bus from "@fruster/bus";
import CarHandler from "./lib/handlers/CarHandler";

export async function start(busAddress: string) {
  await bus.connect(busAddress);

  registerHandlers();
}

const registerHandlers = () => {
  new CarHandler();
};
