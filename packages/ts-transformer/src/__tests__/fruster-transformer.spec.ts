import * as ts from "typescript";
import frusterTransformerPlugin, {
  TransformerOptions,
} from "../transformers/fruster-transformer";

const testFiles = [
  "src/__tests__/fixtures/handler1.ts",
  "src/__tests__/fixtures/handler2.ts",
  "src/__tests__/fixtures/handler3.ts",
];

describe("frusterTransformerPlugin", () => {
  let program: ts.Program;

  const opts: TransformerOptions = {
    handlerPath: "src/__tests__/fixtures/handler*",
  };

  beforeAll(async () => {
    program = ts.createProgram(testFiles, {
      noEmit: true,
      experimentalDecorators: true,
    });
  });

  describe("handle both method declaration syntax and property declaration with arrow function syntax", () => {
    let transformedFile = "";

    beforeAll(() => {
      transformedFile = runTransform(program, opts, testFiles[0]);
    });

    it("should parse method declaration", () => {
      expect(transformedFile).toMatch(
        `requestSchema: { \"type\": \"object\", \"properties\": { \"model\": { \"type\": \"string\" }, \"brand\": { \"type\": \"string\" } }, \"additionalProperties\": false, \"required\": [\"model\"], \"$schema\": \"http://json-schema.org/draft-07/schema#\" }`
      );
    });

    it("should parse property declaration with arrow function", () => {
      expect(transformedFile).toMatch(
        `responseSchema: { \"type\": \"object\", \"properties\": { \"model\": { \"type\": \"string\" }, \"brand\": { \"type\": \"string\" } }, \"additionalProperties\": false, \"required\": [\"model\"], \"$schema\": \"http://json-schema.org/draft-07/schema#\" }`
      );
    });
  });

  describe("handle inline types, arrays, etc", () => {
    let transformedFile = "";

    beforeAll(() => {
      transformedFile = runTransform(program, opts, testFiles[1]);
    });

    it("should parse and set schema when request and response is set as inline type literal", () => {
      expect(transformedFile).toMatch(
        `requestSchema: { \"type\": \"object\", \"properties\": { \"model\": { \"type\": \"string\" } }, \"additionalProperties\": false, \"required\": [\"model\"], \"$schema\": \"http://json-schema.org/draft-07/schema#\" }`
      );

      expect(transformedFile).toMatch(
        `responseSchema: { \"type\": \"object\", \"properties\": { \"model\": { \"type\": \"string\" } }, \"additionalProperties\": false, \"required\": [\"model\"], \"$schema\": \"http://json-schema.org/draft-07/schema#\" }`
      );
    });

    it("should parse and set schemas for array", () => {
      expect(alignString(transformedFile)).toMatch(
        `requestSchema: { \"type\": \"array\", \"items\"`
      );

      expect(alignString(transformedFile)).toMatch(
        `responseSchema: { \"type\": \"array\", \"items\"`
      );
    });

    // it("should parse and set schemas for pick and omit", () => {
    //   // expect(alignString(transformedFile)).toMatch(
    //   //   `requestSchema: { \"type\": \"array\", \"items\": { \"type\": \"object\", \"properties\": { \"model\": { \"type\": \"string\" } }, \"additionalProperties\": false, \"required\": [\"model\"] }, \"$schema\": \"http://json-schema.org/draft-07/schema#\" }`
    //   // );

    //   // expect(alignString(transformedFile)).toMatch(
    //   //   `responseSchema: { \"type\": \"array\", \"items\": { \"type\": \"object\", \"properties\": { \"model\": { \"type\": \"string\" } }, \"additionalProperties\": false, \"required\": [\"model\"] }, \"$schema\": \"http://json-schema.org/draft-07/schema#\" } }`
    //   // );

    //   console.log(transformedFile);
    // });
  });

  describe("handle query and param parsing", () => {
    let transformedFile = "";

    beforeAll(() => {
      transformedFile = runTransform(program, opts, testFiles[2]);
    });

    it("should parse params", () => {
      expect(transformedFile).toMatch(`query: { "name": "Name of car" }`);
      expect(transformedFile).toMatch(`This should not be overwritten`);
    });
  });
});

function runTransform(
  program: ts.Program,
  opts: TransformerOptions,
  fileName: string
) {
  const sf = program.getSourceFile(fileName);

  if (!sf) {
    fail("Failed to get source file: " + fileName);
  }

  const res = ts.transform(sf, [frusterTransformerPlugin(program, opts)]);

  const transformedSourceFile = res.transformed[0];
  const printer = ts.createPrinter();
  const result = printer.printNode(
    ts.EmitHint.Unspecified,
    transformedSourceFile,
    sf
  );

  return result;
}

/**
 * Strips white spaces, tabs, new lines to make matching easier
 */
function alignString(str: string) {
  return str.replace(/(\r\n|\n|\r)/gm, "").replace(/^\s+|\s+$|\s+(?=\s)/g, "");
}
