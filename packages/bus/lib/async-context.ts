import { AsyncLocalStorage } from "async_hooks";

const CONTEXT_KEY_REQ_ID = "reqId";
const CONTEXT_KEY_USER = "user";

export const asyncStorage = new AsyncLocalStorage<Map<string, any>>();

export function reqId() {
	return asyncStorage.getStore()!.get(CONTEXT_KEY_REQ_ID);
}

export function user() {
	return asyncStorage.getStore()!.get(CONTEXT_KEY_USER);
}

export function setReqId(reqId: string) {
	asyncStorage.getStore()!.set(CONTEXT_KEY_REQ_ID, reqId);
}

export function setUser(user: any) {
	asyncStorage.getStore()!.set(CONTEXT_KEY_USER, user);
}
