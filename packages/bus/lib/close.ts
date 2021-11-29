import { Client } from "nats";
import { ConnectedClient } from "./connect";

let connectedClients: ConnectedClient[] = [];

/**
 * Disconnect/close connection to NATS bus.
 */
export default (client: ConnectedClient) => {
	// Save connected client(s) to be able to closeAll
	connectedClients.push(client);

	return {
		close,
		closeAll,
		connectedClients: getConnectedClients,
		clearClients: clearClients,
	};
};

/**
 * @param {Object} client
 */
function close(client: Client) {
	// if (client.connected) {
	client.close();
	// }
}

function closeAll() {
	connectedClients.forEach((client) => {
		return close(client);
	});
}

function getConnectedClients() {
	return connectedClients;
}

function clearClients() {
	connectedClients = [];
}
