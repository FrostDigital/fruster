const testUtils = require("@fruster/test-utils");
const FrusterLogger = require("../FrusterLogger");

describe("FrusterLogger", () => {
  let log;

  beforeEach(() => {
    log = new FrusterLogger("silly", "Europe/Stockholm");
  });

  it("should log all levels", () => {
    log.error("This", "is", "error");
    log.warn("This", "is", "warn");
    log.remote("This", "is", "remote");
    log.audit("fake-user-id", "This is audit");
    log.info("This", "is", "info");
    log.debug("This", "is", "debug");
    log.silly("This", "is", "silly");
  });

  it("should info log a json object", () => {
    log.info(
      "Info: A JSON object",
      {
        foo: 1,
        bar: {
          a: 1,
          b: 2,
        },
      },
      "yeah!"
    );
  });

  it("should debug log a json object", () => {
    log.debug(
      "Debug: A JSON object",
      {
        foo: 1,
        bar: {
          a: 1,
          b: 2,
        },
      },
      "yeah!"
    );
  });

  it("should error log a json object", () => {
    log.error(
      "Error: A JSON object",
      {
        foo: 1,
        bar: {
          a: 1,
          b: 2,
        },
      },
      "yeah!"
    );
  });

  it("should error log in American timezone", () => {
    log = new FrusterLogger("silly", "America/Los_Angeles");
    log.error("What time is it, Trump?");
  });

  it("should audit log even though not connected to bus", () => {
    log.audit("userId", "message");
  });
});
