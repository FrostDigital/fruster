import bus from "../index";

describe("request many", () => {
	const subject = "leSubject";

	afterAll(() => {
		bus.closeAll();
	});

	function setupSubscribers(delay = 0) {
		bus.subscribe({
			subject,
			responseSchema: "",
			createQueueGroup: false,
			handle: (req) => {
				return {
					status: 200,
					data: {
						answer: 2,
					},
				};
			},
		});

		bus.subscribe({
			subject,
			responseSchema: "",
			createQueueGroup: false,
			handle: (req) => {
				return {
					status: 200,
					data: {
						answer: 1,
					},
				};
			},
		});

		bus.subscribe({
			subject,
			responseSchema: "",
			createQueueGroup: false,
			handle: async (req) => {
				await doDelay(delay);

				return {
					status: 200,
					data: {
						answer: 3,
					},
				};
			},
		});
	}

	it("should return answers from all subscribers", async (done) => {
		await bus.connect("nats://mock");

		setupSubscribers();

		const responses = await bus.requestMany({
			subject,
			message: {
				reqId: "hello",
			},
		});

		expect(responses.length).toBe(3, "repsonses.length");

		expect(responses.find((response) => response.data.answer === 3)).toBeTruthy(
			"Should have one answer w/ value 3"
		);
		expect(responses.find((response) => response.data.answer === 2)).toBeTruthy(
			"Should have one answer w/ value 2"
		);
		expect(responses.find((response) => response.data.answer === 1)).toBeTruthy(
			"Should have one answer w/ value 1"
		);

		done();
	});

	it("should be possible to limit amount of responses", async (done) => {
		await bus.connect("nats://mock");

		setupSubscribers(10);

		const responses = await bus.requestMany({
			subject,
			maxResponses: 2,
			message: {
				reqId: "hello",
			},
		});

		expect(responses.length).toBe(2, "repsonses.length");
		expect(responses.find((response) => response.data.answer === 2)).toBeTruthy(
			"Should have one answer w/ value 2"
		);
		expect(responses.find((response) => response.data.answer === 1)).toBeTruthy(
			"Should have one answer w/ value 1"
		);

		done();
	});
});

function doDelay(delay: number) {
	return new Promise((resolve, reject) => {
		setTimeout(() => resolve(undefined), delay);
	});
}
