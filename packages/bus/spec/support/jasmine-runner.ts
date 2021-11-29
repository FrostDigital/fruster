const Jasmine = require("jasmine");
import { SpecReporter, StacktraceOption } from "jasmine-spec-reporter";
const noop = function () {};

/*
    Bootstraps Jasmine and use the jasmine-spec-reporter which
    makes test ouput look prettier compared to default reporter.
*/

let jrunner = new Jasmine();
jrunner.configureDefaultReporter({
	print: noop,
});
jasmine.getEnv().addReporter(
	new SpecReporter({
		spec: {
			displayStacktrace: StacktraceOption.RAW,
		},
	})
);
jrunner.loadConfigFile();
jrunner.execute();
