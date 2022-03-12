import bus from "@fruster/bus";
import log from "@fruster/log";
import { start as startHealthCheck } from "@fruster/health";
import { start } from "./demo-service";
import * as config from "./config";

/**
 * Main entry point for starting the service.
 *
 * Must exit with an exit code greater than 1 in case service
 * could not be started which most commonly happens if it cannot
 * connect to bus or mongo (if mongo is used).
 */
(async function () {
  try {
    await start({ natsUrl: config.bus });
    log.info(`Successfully started demo-app`);
    await startHealthCheck(bus);
  } catch (err: any) {
    log.error(`Failed starting demo-app`, err);
    process.exit(1);
  }
})();

export default () => {};
