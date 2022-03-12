#!/usr/bin/env node
const ts = require("typescript");
const tsNode = require("ts-node").register;
const path = require("path");
const { DiagnosticCategory } = require("typescript");
const frusterTransformer = require("@fruster/ts-transformer").default;
const tsConfig = require(path.join(process.cwd(), "/tsconfig.json"));

/**
 *
 * @param {string[]} args
 */
function main(args) {
  const { options, fileNames } = ts.parseJsonConfigFileContent(
    tsConfig,
    ts.sys,
    process.cwd()
  );

  const program = ts.createProgram(fileNames, options);

  const allDiag = [
    ...program.getSemanticDiagnostics(),
    ...program.getGlobalDiagnostics(),
  ];

  const errors = allDiag.filter((d) => d.category === DiagnosticCategory.Error);

  if (errors.length > 0) {
    errors.forEach(prettyPrintDiagnostic);
    console.log();
    console.error(
      `💥 fruster-runner aborted compilation due to ${errors.length} error(s)`
    );
    console.log();
    process.exit(1);
  }

  const transformers = {
    before: [
      frusterTransformer(program, {
        handlerPath:
          tsConfig.fruster && tsConfig.fruster.handlersPath
            ? tsConfig.fruster.handlersPath
            : "**/lib/handlers/**/*",
      }),
    ],
    after: [],
  };

  const entryFile = args[2];

  if (!entryFile) {
    console.error("Enter entry point, for example `fruster-runner app.ts`");
    process.exit(1);
  }

  tsNode({
    files: fileNames,
    compilerOptions: tsConfig.compilerOptions,
    transformers,
  });

  require(path.join(process.cwd(), entryFile));
}

/**
 *
 * @param {ts.Diagnostic} diag
 */
function prettyPrintDiagnostic(diag) {
  const msg =
    typeof diag.messageText === "string"
      ? diag.messageText
      : diag.messageText.messageText;
  const filePath = diag.file.fileName.replace(process.cwd(), ".");
  console.log();
  console.log("\x1b[2m" + filePath + "\x1b[0m");
  console.log(msg);
}

try {
  main(process.argv);
} catch (err) {
  console.error(err);
}
