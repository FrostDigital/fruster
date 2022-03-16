import { AsyncLocalStorage } from "async_hooks";

const CONTEXT_KEY_REQ_ID = "reqId";
const CONTEXT_KEY_USER = "user";

export const asyncStorage = new AsyncLocalStorage<Map<string, any>>();

export function reqId() {
	const store = asyncStorage.getStore();
	return store ? store.get(CONTEXT_KEY_REQ_ID) : undefined;
}

export function user() {
	const store = asyncStorage.getStore();
	return store ? store.get(CONTEXT_KEY_USER) : undefined;
}

export function setReqId(reqId: string) {
	const store = asyncStorage.getStore();
	if (store) {
		store.set(CONTEXT_KEY_REQ_ID, reqId);
	}
}

export function setUser(user: any) {
	const store = asyncStorage.getStore();
	if (store) {
		store.set(CONTEXT_KEY_USER, user);
	}
}
