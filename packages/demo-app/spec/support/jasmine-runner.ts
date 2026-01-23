const Jasmine = require("jasmine");
const SpecReporter = require("jasmine-spec-reporter").SpecReporter;
const noop = function () {};

/*
	Bootstraps Jasmine and use the jasmine-spec-reporter which
	makes test output look prettier compared to default reporter.
*/
let jRunner = new Jasmine({});
jRunner.configureDefaultReporter({ print: noop });
jasmine.getEnv().addReporter(new SpecReporter());
jRunner.loadConfigFile("./spec/support/jasmine.json");

// Parse command line arguments
// Usage: fruster-runner jasmine-runner.ts [spec-files...] [--filter=pattern]
const args = process.argv.slice(2);
let specFiles: string[] | undefined;
let filterString: string | undefined;

for (let i = 0; i < args.length; i++) {
	const arg = args[i];

	if (arg.startsWith("--filter=")) {
		filterString = arg.substring("--filter=".length);
	} else if (arg === "--filter") {
		filterString = args[++i];
	} else if (!arg.startsWith("--")) {
		// Treat as spec file path
		if (!specFiles) specFiles = [];
		specFiles.push(arg);
	}
}

jRunner.execute(specFiles, filterString);

export default () => {};
