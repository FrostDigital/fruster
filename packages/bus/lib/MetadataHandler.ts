import { FrusterRequest } from "./model/FrusterRequest";
import subscribeCache from "./subscribe-cache";
import * as schemas from "./schemas";

/**
 * Handler that returns meta data of all subscribes this
 * service exposes.
 */
class MetadataHandler {
	/**
	 * @param {FrusterRequest} req
	 */
	handle(req: FrusterRequest) {
		return {
			status: 200,
			data: {
				exposing: subscribeCache.get(),
				schemas: schemas.get(),
				sourceVersion: process.env.SOURCE_VERSION || "n/a",
			},
		};
	}
}

export default MetadataHandler;
