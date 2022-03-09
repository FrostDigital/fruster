import * as ts from "typescript";
import {
  findChildrenOfKind,
  findFirstChildOfKind,
  findFirstChildOfKindOrThrow,
  findFirstNestedChildOfKind,
  getFrusterRequestType,
  getFrusterResponseType,
} from "../transformers/utils";

const testFiles = ["src/__tests__/fixtures/file1.ts"];

describe("utils", () => {
  let program: ts.Program;

  beforeAll(async () => {
    program = ts.createProgram(testFiles, {
      noEmit: true,
    });

    program.emit();
  });

  it("should findFirstChildOfKind", () => {
    const testFile1 = program.getSourceFile(testFiles[0])!;

    const node = findFirstChildOfKind(
      testFile1,
      ts.SyntaxKind.ClassDeclaration
    );

    expect(node?.kind).toBe(ts.SyntaxKind.ClassDeclaration);
    expect(node?.getText()).toMatch("class Handler");
  });

  it("should findFirstNestedChildOfKind", () => {
    const testFile1 = program.getSourceFile(testFiles[0])!;

    const node = findFirstNestedChildOfKind(
      testFile1,
      ts.SyntaxKind.MethodDeclaration
    );

    expect(node?.kind).toBe(ts.SyntaxKind.MethodDeclaration);
    expect(node?.getText()).toMatch(
      "handle(req: FrusterRequest<Car>): FrusterResponse<Car>"
    );
  });

  it("should findFirstChildOfKindOrThrow", () => {
    const testFile1 = program.getSourceFile(testFiles[0])!;

    const node = findFirstChildOfKindOrThrow(
      testFile1,
      ts.SyntaxKind.ClassDeclaration
    );

    expect(node.kind).toBe(ts.SyntaxKind.ClassDeclaration);
    expect(node?.getText()).toMatch("class Handler");
  });

  it("should findFirstChildOfKindOrThrow (and throw)", () => {
    const testFile1 = program.getSourceFile(testFiles[0])!;

    try {
      findFirstChildOfKindOrThrow(
        testFile1,
        ts.SyntaxKind.AsteriskAsteriskEqualsToken // <-- non existing, will throw
      );
      expect(true).toBeFalsy();
    } catch (err) {
      expect(true).toBeTruthy();
    }
  });

  it("should findChildrenOfKind", () => {
    const testFile1 = program.getSourceFile(testFiles[0])!;

    const i = findFirstChildOfKind(
      testFile1,
      ts.SyntaxKind.InterfaceDeclaration
    );

    if (!i) {
      fail("should have found interface");
    }

    const nodes = findChildrenOfKind(i, ts.SyntaxKind.PropertySignature);

    expect(nodes).toHaveLength(2);
    expect(nodes[0].kind).toBe(ts.SyntaxKind.PropertySignature);
    expect(nodes[1].kind).toBe(ts.SyntaxKind.PropertySignature);
  });

  it("should getFrusterRequestType", () => {
    const testFile1 = program.getSourceFile(testFiles[0])!;

    const param = findFirstNestedChildOfKind(
      testFile1,
      ts.SyntaxKind.Parameter
    );

    if (!param) {
      fail("should have found parameter");
    }

    const typeNode = getFrusterRequestType(param as ts.ParameterDeclaration);

    expect(typeNode).toBeDefined();
    expect(typeNode?.getText()).toBe("Car");
  });

  it("should getFrusterResponseType", () => {
    const testFile1 = program.getSourceFile(testFiles[0])!;

    const classDeclaration = findFirstNestedChildOfKind(
      testFile1,
      ts.SyntaxKind.ClassDeclaration
    ) as ts.ClassDeclaration;

    const methods = findChildrenOfKind(
      classDeclaration,
      ts.SyntaxKind.MethodDeclaration
    );

    if (methods.length === 0) {
      fail("should have methods");
    }

    // FrusterResponse<Car>
    const methodWithoutPromise = methods[0];

    const typeNode1 = getFrusterResponseType(
      methodWithoutPromise.getChildAt(5) as ts.TypeReferenceNode
    );

    expect(typeNode1).toBeDefined();
    expect(typeNode1?.getText()).toBe("Car");

    // Promise<FrusterResponse<Car>>
    const methodWithPromise = methods[1];

    const typeNode2 = getFrusterResponseType(
      methodWithPromise.getChildAt(6) as ts.TypeReferenceNode
    );

    expect(typeNode2).toBeDefined();
    expect(typeNode2?.getText()).toBe("Car");

    // Promise<FrusterResponse<number>>
    const methodWithPromiseAndNumber = methods[2];

    const typeNode3 = getFrusterResponseType(
      methodWithPromiseAndNumber.getChildAt(6) as ts.TypeReferenceNode
    );

    // Note: primitives are note supported
    expect(typeNode3).toBeUndefined();
  });
});
