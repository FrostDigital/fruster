import bus from "@fruster/bus";
import CarHandler from "./lib/handlers/CarHandler";

export async function start({ natsUrl }: { natsUrl: string }) {
  await bus.connect(natsUrl);

  registerHandlers();
}

const registerHandlers = () => {
  new CarHandler();
};
