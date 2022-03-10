import { startNatsServerAndConnectBus, TestConnection } from "./support/test-utils";
import bus from "../index";
import * as uuid from "uuid";

describe("Performance", function () {
	let natsConnection: TestConnection;
	let subject: string;

	beforeEach(() => {
		subject = uuid.v4();
	});

	beforeAll((done) => {
		startNatsServerAndConnectBus()
			.then((connection) => {
				natsConnection = connection;
				done();
			})
			.catch(done.fail);
	});

	afterAll(() => {
		natsConnection.server.kill();
		bus.closeAll();
	});

	it("should handle 10k request and responses within a timely fashion", function (done) {
		const count = 10000;
		let numSuccess = 0;
		let startTime = Date.now();
		let durationsTotal: number[] = [];
		let durationsReqToSub: number[] = [];
		let durationsSubToResp: number[] = [];

		bus.subscribe({
			subject,
			responseSchema: "",
			handle: (req) => {
				const now = Date.now();
				durationsReqToSub.push(now - req.data.time);
				return {
					status: 200,
					data: {
						time: now,
					},
				};
			},
		});

		let i = count;

		do {
			// do while is about 4x faster thana for(var i... loop in this case.
			const reqStartTime = Date.now();

			bus.request({
				subject,
				message: {
					data: {
						time: reqStartTime,
					},
					reqId: "reqId",
				},
			}).then((resp) => {
				const now = Date.now();

				numSuccess++;

				durationsSubToResp.push(now - resp.data.time);
				durationsTotal.push(now - reqStartTime);

				if (numSuccess == count) {
					console.log(`   Done sending and receiving ${count} messages after ${Date.now() - startTime}ms`);
					logTime("Total", durationsTotal);
					logTime("Req -> Sub", durationsReqToSub);
					logTime("Sub -> Resp", durationsSubToResp);
					done();
				}
			});

			i--;
		} while (i != 0);
	});

	function logTime(label: string, array: number[]) {
		console.log("-----------------------------------------");
		console.log(`   ${label} avg ${average(array)}ms`);
		console.log(`   ${label} highest ${Math.max(...array)}ms`);
		console.log(`   ${label} lowest ${Math.min(...array)}ms`);
	}

	var average = (arr: number[]) => arr.reduce((p, c) => p + c, 0) / arr.length;
});
