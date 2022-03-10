import http, { Server } from "http";
import conf from "../../conf";

const FAILURE_STATUS_CODE = 500;

interface HttpPublisherOptions {
	port?: number;
	path?: string;
}

class HttpPublisher {
	private port: number;
	private path: string;
	private httpServer: Server;
	private successData?: any;
	private failureData?: any;

	constructor(options: HttpPublisherOptions = {}) {
		this.port = options.port || conf.port;
		this.path = options.path || conf.path;
		this.httpServer = this._createHttpServer();
	}

	stop() {
		this.httpServer.close();
	}

	publishSuccess(successData = {}) {
		this.successData = successData;
	}

	publishFailure(failureData = {}) {
		delete this.successData;
		this.failureData = failureData;
	}

	_createHttpServer() {
		let server = http.createServer((req, res) => {
			if (req.url === this.path) {
				if (this.successData) {
					res.writeHead(200, { "Content-Type": "application/json" });
					res.end(JSON.stringify(this.successData) + "\n");
				} else {
					res.writeHead(FAILURE_STATUS_CODE, {
						"Content-Type": "application/json",
					});
					res.end(JSON.stringify(this.failureData) + "\n");
				}
			} else {
				res.writeHead(404);
				res.end();
			}
		});

		server.listen(this.port);

		return server;
	}
}

export default HttpPublisher;
