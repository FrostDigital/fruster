import { Subscribe } from "./subscribe";

/**
 * Cache containing all registered subscribes.
 *
 * Is use for metadata endpoint, when retrieving index of all
 * subscribes that the service exposes.
 *
 * Also used to determine if internal routing is needed when subjects overlaps.
 */
class SubscribeCache {
	subscribes: Subscribe[] = [];

	get() {
		return this.subscribes.map((sub) => sub.options);
	}

	add(subscribe: Subscribe) {
		this.subscribes.push(subscribe);
	}

	clear() {
		this.subscribes = [];
	}

	removeBySid(sid: number) {
		this.subscribes = this.subscribes.filter((sub) => sub.sid !== sid);
	}
}

const subscribeCache = new SubscribeCache();

export default subscribeCache;
