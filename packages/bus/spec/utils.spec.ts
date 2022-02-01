import utils from "../lib/util/utils";
import constants from "../constants";
import { FrusterRequest } from "..";

describe("Utils", () => {
	it("should parse HTTP subject", () => {
		const subject = "http.get.users.:userId";

		expect(utils.parseSubject(subject)).toEqual({
			subject: "http.get.users.*",
			isHTTP: true,
			httpMethod: "GET",
		});
	});

	it("should parse non HTTP subject", () => {
		const subject = "user-service.get.:userId";

		expect(utils.parseSubject(subject)).toEqual({
			subject: "user-service.get.*",
			isHTTP: false,
			httpMethod: undefined,
		});
	});

	it("should parse non HTTP subject", () => {
		const subject = "user-service.get.:userId.profile.:firstName";
		const actualSubject = "user-service.get.abc123.profile.bob";

		expect(utils.parseParams(subject, actualSubject)).toEqual({
			userId: "abc123",
			firstName: "bob",
		});
	});

	it("should parse HTTP subject that has {dot}", () => {
		const subject = "http.get.book.:version";
		const actualSubject = "http.get.book.1{dot}0{dot}1";

		expect(utils.parseParams(subject, actualSubject)).toEqual({
			version: "1.0.1",
		});
	});

	it("should compress and decompress json", async () => {
		const data = { foo: "bar" };

		const compressedMessage = await utils.compress({ data } as FrusterRequest);
		expect(compressedMessage.data).toBeDefined();
		expect(compressedMessage.dataEncoding).toBe(constants.CONTENT_ENCODING_GZIP);

		const decompressedJson = await utils.decompress(compressedMessage.data);
		expect(decompressedJson).toEqual(data);
	});

	it("should calculate chunks", () => {
		const chunks = utils.calcChunks("012345678", 2);

		expect(chunks.length).toBe(5);
		expect(chunks[0]).toBe("01");
		expect(chunks[4]).toBe("8");
	});

	describe("NATS subject match", () => {
		it("should match >", () => {
			expect(utils.matchSubject("foo.bar", ">")).toBeTruthy();
		});

		it("should match foo.* ", () => {
			expect(utils.matchSubject("foo.bar", "foo.*")).toBeTruthy();
			expect(utils.matchSubject("foo.*", "foo.*")).toBeTruthy();
			expect(utils.matchSubject("foo.bar.baz", "foo.*")).toBeFalsy();
			expect(utils.matchSubject("foo", "foo.*")).toBeFalsy();
		});

		it("should match foo.*.baz ", () => {
			expect(utils.matchSubject("foo.bar.baz", "foo.*.baz")).toBeTruthy();
			expect(utils.matchSubject("foo.*.baz", "foo.*.baz")).toBeTruthy();
			expect(utils.matchSubject("foo.bar.baz.poo", "foo.*.baz")).toBeFalsy();
		});

		it("should match foo.> ", () => {
			expect(utils.matchSubject("foo.bar.baz", "foo.>")).toBeTruthy();
			expect(utils.matchSubject("foo.bar.baz.poo", "foo.>")).toBeTruthy();
			expect(utils.matchSubject("foo", "foo.>")).toBeFalsy();
		});
	});
});
