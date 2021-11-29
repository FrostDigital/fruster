import bus from "../../index";

const subject = process.env.SUBJECT as string;
const port = process.env.PORT;
const createQueueGroup = process.env.CREATE_QUEUE_GROUP == "true";
const timeout = 4000;

bus.connect("nats://localhost:" + port).then(() => {
	console.log("Spawned client was connected 🔌");

	bus.subscribe(
		{
			subject: subject,
			createQueueGroup: createQueueGroup,
		},
		handle
	);

	console.log("Subscribing to", subject);

	setTimeout(handleTimeout, timeout);

	function handle(req: any) {
		console.log("Got request");
		// Exit process with success code if we got message :)
		process.exit(0);
	}

	function handleTimeout() {
		console.log("Timeout");
		// Exit process with error code if no subscribe after timeout
		process.exit(1);
	}
});
