import * as minimatch from "minimatch";
import * as ts from "typescript";
import * as TJS from "../typescript-json-schema";
import {
  findChildBeforeChildOfKind,
  findFirstChildOfKind,
  findFirstChildOfKindOrThrow,
  findFirstNestedChildOfKind,
  getFrusterRequestType,
  getFrusterResponseType,
} from "./utils";

const DEBUG = !!process.env.DEBUG_FRUSTER_TRANSFORMER;

export type TransformerOptions = {
  /**
   * Path to where handler files are located. Only these files
   * will be scanned for subscribes. Support wildcard glob-style.
   */
  handlerPath: string;
};

export default function frusterTransformerPlugin(
  program: ts.Program,
  options?: TransformerOptions
): ts.TransformerFactory<ts.SourceFile> {
  const checker = program.getTypeChecker();

  debugLog("Starting fruster-transformer");

  return (ctx: ts.TransformationContext) => {
    const printer = ts.createPrinter();
    return (sourceFile: ts.SourceFile) => {
      if (!minimatch(sourceFile.fileName, options?.handlerPath || "**/*.ts")) {
        return sourceFile;
      }

      debugLog("Analyzing " + sourceFile.fileName);

      function visitHandlerSourceFile(node: ts.Node) {
        if (ts.isClassDeclaration(node) && hasSubscribeDecorator(node)) {
          debugLog(
            `Found class with @subscribe in file ${
              node.getSourceFile().fileName
            }`
          );
          return parseHandler(node, program, checker, ctx);
        }
        return node;
      }

      return ts.visitEachChild(sourceFile, visitHandlerSourceFile, ctx);
    };
  };
}

function parseHandler(
  classDeclaration: ts.ClassDeclaration,
  program: ts.Program,
  checker: ts.TypeChecker,
  ctx: ts.TransformationContext
) {
  /*
    Parse methods decorated with @subscribe and retrieve:

    - Request type/schema - derived from `handler(req: FrusterRequest<TypeHere>)`
    - Response type/schema - derived from `handler(...): Promise<FrusterResponse<TypeHere>>`

    Note that there are several formats how type arguments can be set. The following (edge) cases 
    has been observed:

    - Type argument is a primitive (not supported)
    - Type argument response is either wrapped in Promise or not (both supported)

   */

  function visitSubscribeMethodOrPropertyDeclaration(
    node: ts.Node,
    reqSchema?: ts.ObjectLiteralExpression,
    resSchema?: ts.ObjectLiteralExpression
  ) {
    if (ts.isDecorator(node)) {
      const objectLiteral = findFirstNestedChildOfKind(
        node,
        ts.SyntaxKind.ObjectLiteralExpression
      ) as ts.ObjectLiteralExpression;

      if (!objectLiteral) {
        console.warn(
          `WARNING: @subscribe in file ${
            node.getSourceFile().fileName
          } is missing properties`
        );
        return node;
      }

      const properties = [...objectLiteral.properties];

      if (reqSchema) {
        if (
          objectLiteral.properties.find(
            (p: ts.PropertyAssignment) => p.name.getText() === "requestSchema"
          )
        ) {
          debugLog(
            `Request schema was parsed, but requestSchema is already set in @subscribe so skipping it`
          );
        } else {
          properties.push(
            ts.factory.createPropertyAssignment(
              ts.factory.createIdentifier("requestSchema"),
              ts.factory.createObjectLiteralExpression(reqSchema.properties)
            )
          );

          debugLog(`Did set requestSchema`);
        }
      }

      if (resSchema) {
        if (
          objectLiteral.properties.find(
            (p: ts.PropertyAssignment) => p.name.getText() === "responseSchema"
          )
        ) {
          debugLog(
            `Response schema was parsed, but responseSchema is already set in @subscribe so skipping it`
          );
        } else {
          properties.push(
            ts.factory.createPropertyAssignment(
              ts.factory.createIdentifier("responseSchema"),
              ts.factory.createObjectLiteralExpression(resSchema.properties)
            )
          );

          debugLog(`Did set responseSchema`);
        }
      }

      if (properties.length === objectLiteral.properties.length) {
        return node; // no change
      }

      return ts.factory.createDecorator(
        ts.factory.createCallExpression(
          findFirstNestedChildOfKind(
            node,
            ts.SyntaxKind.Identifier
          ) as ts.Identifier,
          undefined,
          [ts.factory.createObjectLiteralExpression(properties, false)]
        )
      );
    }
    return node;
  }

  function visitClassDeclaration(node: ts.Node) {
    let methodOrPropertyDeclaration:
      | ts.PropertyDeclaration
      | ts.MethodDeclaration
      | undefined = undefined;

    if (ts.isPropertyDeclaration(node)) {
      const sub = getSubscribeDecorator(node);

      if (!sub) {
        // non decorated property
        return node;
      }

      if (!findFirstChildOfKind(node, ts.SyntaxKind.ArrowFunction)) {
        // property does not have an arrow function
        console.warn(
          "WARNING: Property declaration with @subscribe does not have an arrow function, either set one or use method syntax"
        );
        return node;
      }

      methodOrPropertyDeclaration = node;
    } else if (ts.isMethodDeclaration(node)) {
      const sub = getSubscribeDecorator(node);

      if (!sub) {
        // non decorated property
        return node;
      }

      methodOrPropertyDeclaration = node;
    }

    if (methodOrPropertyDeclaration) {
      const returnType =
        findChildBeforeChildOfKind(
          methodOrPropertyDeclaration,
          ts.SyntaxKind.Block
        )?.kind === ts.SyntaxKind.TypeReference
          ? findChildBeforeChildOfKind(
              methodOrPropertyDeclaration,
              ts.SyntaxKind.Block
            )
          : undefined;

      let parameter: ts.ParameterDeclaration;

      if (ts.isMethodDeclaration(methodOrPropertyDeclaration)) {
        parameter = findFirstChildOfKindOrThrow(
          methodOrPropertyDeclaration,
          ts.SyntaxKind.Parameter
        ) as ts.ParameterDeclaration;
      } else if (ts.isPropertyDeclaration(methodOrPropertyDeclaration)) {
        // If PropertyDeclaration te parameter is nested within arrow function
        const fnTypeNode = findFirstChildOfKindOrThrow(
          methodOrPropertyDeclaration,
          ts.SyntaxKind.ArrowFunction
        );

        parameter = findFirstChildOfKindOrThrow(
          fnTypeNode,
          ts.SyntaxKind.Parameter
        ) as ts.ParameterDeclaration;
      } else {
        throw new Error(
          "Expected node to be either method declaration or property declaration"
        );
      }

      const reqTypeNode = getFrusterRequestType(parameter);
      const resTypeNode = returnType
        ? getFrusterResponseType(returnType as ts.TypeReferenceNode)
        : undefined;

      let reqSchema: ts.ObjectLiteralExpression | undefined;
      let resSchema: ts.ObjectLiteralExpression | undefined;

      if (reqTypeNode) {
        reqSchema = getSchemaForType(program, checker, reqTypeNode);
      }

      if (resTypeNode) {
        resSchema = getSchemaForType(program, checker, resTypeNode);
      }

      return ts.visitEachChild(
        methodOrPropertyDeclaration,
        (node) =>
          visitSubscribeMethodOrPropertyDeclaration(node, reqSchema, resSchema),
        ctx
      );
    }

    return node;
  }

  return ts.visitEachChild(classDeclaration, visitClassDeclaration, ctx);
}

/**
 * Util to check if node has any `@subscribe` decorators as children and if so
 * so candidate for transformation.
 *
 * @param node
 * @returns
 */
function hasSubscribeDecorator(node: ts.Node) {
  const decorator = findFirstNestedChildOfKind(
    node,
    ts.SyntaxKind.Decorator,
    (candidate) => candidate.getText().indexOf("@subscribe") === 0
  );

  return !!decorator;
}

function getSubscribeDecorator(node: ts.Node) {
  return findFirstNestedChildOfKind(
    node,
    ts.SyntaxKind.Decorator,
    (candidate) => candidate.getText().indexOf("@subscribe") === 0
  );
}

let generator: TJS.JsonSchemaGenerator | null = null;

let schemaCounter = 0;

/**
 * Generates a JSON schema from type.
 *
 * @param program
 * @param typeNode
 */
function getSchemaForType(
  program: ts.Program,
  checker: ts.TypeChecker,
  typeNode: ts.TypeNode
) {
  if (!generator) {
    generator = TJS.buildGenerator(program as TJS.Program, {
      uniqueNames: true,
      noExtraProps: true,
      strictNullChecks: true,
      required: true,
    });

    if (!generator) {
      throw new Error("Failed to build json schema generator");
    }
  }

  const type = checker.getTypeFromTypeNode(typeNode);
  const typeSymbol = type.getSymbol() || type.aliasSymbol;

  if (!typeSymbol) {
    throw new Error(
      `Type ${type.getBaseTypes()} does not have any symbol - cannot generate schema`
    );
  }

  schemaCounter++;

  let symbolName = "";

  // TODO: Add ~this logic back if needed to reuse schemas

  // if (
  //   ts.isArrayTypeNode(typeNode) ||
  //   (ts.isTypeReferenceNode(typeNode) &&
  //     typeNode.getText().indexOf("Array") === 0)
  // ) {
  //   // Type is defined inline as a type literal, for example FrusterRequest<{model: string}>
  //   symbolName = typeNode.getSourceFile().fileName + "_" + schemaCounter;
  // } else if (ts.isTypeReferenceNode(typeNode)) {
  //   // Type is a reference for example FrusterRequest<Car> which is all good, however
  //   // ts utility types (omit, pick, etc) needs to be handled
  //   if (
  //     typeNode.getText().indexOf("Omit") === 0 ||
  //     typeNode.getText().indexOf("Pick") === 0
  //   ) {
  //     // TODO: Add support for more util types, if needed to
  //     typeNode.getSourceFile().fileName + "_" + schemaCounter;
  //   } else {
  //     symbolName = typeSymbol.getName();
  //   }
  // } else if (ts.isTypeLiteralNode(typeNode)) {
  //   // Type is defined inline as a type literal, for example FrusterRequest<{model: string}>
  //   symbolName = typeNode.getSourceFile().fileName + "_" + schemaCounter;
  // }

  symbolName = typeNode.getSourceFile().fileName + "_" + schemaCounter;

  const symbolList = generator.getSymbols(symbolName);

  let schema: TJS.Definition;

  if (symbolList.length === 0) {
    generator.addSymbol(type, typeSymbol, symbolName);

    schema = generator.getSchemaForSymbol(symbolName, true);
  } else {
    if (symbolList.length > 1) {
      console.warn(
        `WARNING: Found multiple symbols named ${typeSymbol.getName()} which are candidates for JSON schema, will pick first one`
      );
    }
    schema = generator.getSchemaForSymbol(symbolList[0].name, true);
  }

  return ts.parseJsonText("tmp", JSON.stringify(schema)).statements[0]
    .expression as ts.ObjectLiteralExpression;
}

function debugLog(msg: string) {
  if (DEBUG) {
    console.log("[FRUSTER TRANSFORMER]", msg);
  }
}
