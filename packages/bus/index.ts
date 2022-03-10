// import connect from "./lib/connect";
import conf from "./conf";
import FrusterBus from "./lib/FrusterBus";
import pjson from "./package.json";

// export * from "./lib/connect";
export * from "./lib/model/FrusterRequest";
export * from "./lib/model/FrusterResponse";
export type { SubscribeOptions } from "./lib/subscribe";

export default new FrusterBus();

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

// TODO: Same as ConnectParams?
