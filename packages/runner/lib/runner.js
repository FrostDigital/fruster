#!/usr/bin/env node
const ts = require("typescript");
const tsNode = require("ts-node").register;
const path = require("path");
const { DiagnosticCategory } = require("typescript");
const frusterTransformer = require("@fruster/ts-transformer").default;
const tsConfig = require(path.join(process.cwd(), "/tsconfig.json"));
const fs = require("fs");

/**
 *
 * @param {string[]} args
 */
function main(args) {
  const buildTime = args.includes("--build");

  const { options, fileNames } = ts.parseJsonConfigFileContent(
    tsConfig,
    ts.sys,
    process.cwd()
  );

  if (buildTime) {
    if (!options.outDir) {
      console.error(
        "💥 fruster-runner aborted compilation: outDir must be specified in tsconfig.json"
      );
      process.exit(1);
    }

    clearOutputDirectory(options.outDir);
  }

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

  if (buildTime) {
    // Build-time: emit transformed JavaScript files
    emitTransformedFiles(program, transformers, options, fileNames);
    console.log("✅ Transformed files emitted successfully.");
  } else {
    // Runtime: use ts-node with transformers
    tsNode({
      files: fileNames,
      compilerOptions: tsConfig.compilerOptions,
      transformers,
    });

    // Preserve additional arguments after entry file for the script to use
    // Remove node, fruster-runner, and entry file from argv
    process.argv = [process.argv[0], entryFile, ...args.slice(3)];

    require(path.join(process.cwd(), entryFile));
  }
}

/**
 * Emit transformed JavaScript files to the output directory.
 * @param {ts.Program} program
 * @param {ts.CustomTransformers} transformers
 * @param {ts.CompilerOptions} options
 * @param {string[]} fileNames
 */
function emitTransformedFiles(program, transformers, options, fileNames) {
  // Get source files from program - these have full semantic info including decorators
  const sourceFiles = program.getSourceFiles().filter(
    (sf) => !sf.isDeclarationFile && !sf.fileName.includes("node_modules")
  );

  // Transform each source file individually
  const transformedFiles = new Map();
  for (const sourceFile of sourceFiles) {
    const result = ts.transform(sourceFile, [
      (context) => {
        const transformerFactory = transformers.before[0];
        return transformerFactory(context);
      },
      ...transformers.after,
    ]);

    if (result.transformed.length > 0) {
      transformedFiles.set(sourceFile.fileName, result.transformed[0]);
    }
    result.dispose();
  }

  // Create a custom write file function that uses transformed AST
  const writeFile = (fileName, data, writeByteOrderMark, onError, sourceFiles) => {
    // Use transformed content if available
    if (sourceFiles && sourceFiles.length > 0) {
      const sourceFile = sourceFiles[0];
      const transformed = transformedFiles.get(sourceFile.fileName);

      if (transformed) {
        // Print the transformed AST to get the output
        const printer = ts.createPrinter();
        const transformedCode = printer.printFile(transformed);

        // Write the transformed code instead of original
        ts.sys.writeFile(fileName, transformedCode, writeByteOrderMark);
        return;
      }
    }

    // Fallback to default behavior
    ts.sys.writeFile(fileName, data, writeByteOrderMark);
  };

  // Emit with custom write function
  const { emitSkipped, diagnostics } = program.emit(
    undefined,
    writeFile,
    undefined,
    undefined,
    undefined  // Don't pass transformers here, we already transformed
  );

  if (emitSkipped) {
    diagnostics.forEach(prettyPrintDiagnostic);
    console.error("❌ Error emitting transformed files.");
    process.exit(1);
  }
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

  const pos = diag.file
    ? ts.getLineAndCharacterOfPosition(diag.file, diag.start)
    : null;

  console.log();
  console.log(
    "\x1b[2m" + filePath + (pos !== null ? ":" + pos.line : "") + "\x1b[0m"
  );
  console.log(msg);
}

function clearOutputDirectory(outDir) {
  if (!outDir) {
    return;
  }

  if (fs.existsSync(outDir)) {
    // console.log(`🧹 Clearing output directory (${outDir})...`);
    fs.rmSync(outDir, { recursive: true, force: true });
  }
}

try {
  main(process.argv);
} catch (err) {
  console.error(err);
}
