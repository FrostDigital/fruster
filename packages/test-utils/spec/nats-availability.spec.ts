import testUtils from "../index";

describe("NATS Server Availability", () => {
	it("should detect if NATS server is available", () => {
		const isAvailable = testUtils.isNatsServerAvailable();

		// This test will pass regardless of whether NATS is installed
		// It just reports the current state
		if (isAvailable) {
			console.log("✓ NATS server is installed and available");
		} else {
			console.warn("⚠️  NATS server is not installed - some tests may be skipped");
		}

		expect(typeof isAvailable).toBe("boolean");
	});

	it("should provide helpful error when NATS is not available", async () => {
		const isAvailable = testUtils.isNatsServerAvailable();

		if (!isAvailable) {
			// Test that the error message is helpful
			try {
				await testUtils.startNatsServer();
				fail("Should have thrown an error");
			} catch (error: any) {
				expect(error.code).toBe("NATS_NOT_INSTALLED");
				expect(error.message).toContain("NATS server is not installed");
				expect(error.message).toContain("https://docs.nats.io");
			}
		} else {
			// If NATS is available, test that it starts successfully
			const connection = await testUtils.startNatsServer();
			expect(connection.server).toBeDefined();
			expect(connection.natsUrl).toContain("nats://localhost");

			// Clean up
			connection.server.kill();
		}
	});
});
