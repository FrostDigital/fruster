import bus from "@fruster/bus";
import { MongoClient } from "mongodb";
import { injections } from "@fruster/decorators";
import GetCarHandler from "./lib/handlers/GetCarHandler";
import CreateCarHandler from "./lib/handlers/CreateCarHandler";
import { CarRepo } from "./lib/repos/CarRepo";
import "./lib/errors";

export async function start(natsUrl: string, mongoUrl?: string) {
  await bus.connect(natsUrl);

  // Connect to MongoDB if URL provided
  if (mongoUrl) {
    const client = new MongoClient(mongoUrl);
    await client.connect();
    const db = client.db();

    // Set up dependency injection
    const carRepo = new CarRepo(db);
    injections({ carRepo });
  }

  registerHandlers();
}

const registerHandlers = () => {
  new GetCarHandler();
  new CreateCarHandler();
};
