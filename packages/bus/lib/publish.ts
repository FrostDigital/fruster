import { Client } from "nats";
import utils from "./util/utils";

let natsClient: Client;

export interface PublishOptions {
	subject: string;
	message: any;
}

export const publish = (client: Client) => {
	natsClient = client;
	return doPublish;
};

/**
 * Publish a message on bus.
 *
 * @param  {String} subject subject to send to
 * @param  {Object} json message to send to subject
 *
 * @return {String} sid
 */
function doPublish(options: PublishOptions) {
	utils.logOutgoingMessage(options.subject, options.message);

	utils.setFromMetadata(options.message);

	return natsClient.publish(options.subject, options.message);
}
