import { createHealthProbe, removeHealthProbe } from "../file-util";

class FileSystemPublisher {
	publishSuccess(_successData: any) {
		createHealthProbe();
	}

	publishFailure(_failureData: any) {
		removeHealthProbe();
	}

	stop() {
		removeHealthProbe();
	}
}

export default FileSystemPublisher;
