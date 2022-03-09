#!/usr/bin/env node
const ts = require("typescript");
const tsNode = require("ts-node").register;
const path = require("path");
const frusterTransformer = require("@fruster/ts-transformer").default;
const tsConfig = require(path.join(process.cwd(), "/tsconfig.json"));

module.export = main = (args) => {
  const { options, fileNames } = ts.parseJsonConfigFileContent(
    tsConfig,
    ts.sys,
    __dirname
  );

  const program = ts.createProgram(fileNames, options);

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
};

main(process.argv);
