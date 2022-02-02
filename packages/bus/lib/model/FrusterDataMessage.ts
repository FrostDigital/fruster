export interface FrusterDataMessage {
	reqId: string;
	transactionId: string;
	chunks: number;
	chunk: number;
	data: string;
}
