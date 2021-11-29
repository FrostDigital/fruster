import frusterBus from "../index";

describe("fruster bus testBus", () => {
	beforeAll(async () => await frusterBus.connect("nats://mock"));

	afterAll(() => frusterBus.closeAll());

	it("should be possible to use without reqId", (done) => {
		const bus = frusterBus.testBus;

		bus.subscribe({
			subject: "some-subject",
			handle: (req) => {
				expect(req.reqId).toBeDefined();
				done();
			},
		});

		bus.request({ subject: "some-subject", message: {} });
	});

	it("should be possible to use with query, params and headers without lint errors", async () => {
		// This test is a little pointless since it doesn't anything that is testable. At least it will be visible that this works when viewing the code!
		const bus = frusterBus.testBus;

		bus.subscribe({
			subject: "some-other-subject",
			handle: (req) => {
				expect(req.query.hello).toBe("12");
				return { status: 200 };
			},
		});

		const res = await bus.request({
			subject: "some-other-subject",
			message: { query: { hello: "12" }, params: { foo: "bar" }, headers: { "Content-Type": "bar" } },
		});

		expect(res).toBeDefined();
	});
});
