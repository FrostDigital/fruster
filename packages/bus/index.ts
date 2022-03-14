import conf from "./conf";
import { FrusterBus } from "./lib/FrusterBus";
import pjson from "./package.json";
export * from "./lib/model/FrusterRequest";
export * from "./lib/model/FrusterResponse";
export * from "./lib/model/FrusterError";
export * from "./lib/errors";

export type { SubscribeOptions } from "./lib/subscribe";

export type { FrusterBus } from "./lib/FrusterBus";

const bus = new FrusterBus();

export default bus;

/**
 * Test friendly version of the bus. Is not as picky which will
 * make your life easier when writing tests.
 */
export const testBus = bus.testBus;

/**
 * Fruster bus version
 * @type {String}
 */
export const version = pjson.version;

/**
 * Instance id
 *
 * @example 586d6aaa-79d7-486e-a6cd-cd351cf9183b
 */
export const instanceId = conf.instanceId;

/**
 * The service using the bus's name
 *
 * @example fruster-user-service
 */
export const serviceName = conf.serviceName;
