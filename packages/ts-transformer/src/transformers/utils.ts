import * as ts from "typescript";

export function findFirstChildOfKind(node: ts.Node, kind: ts.SyntaxKind) {
  return node.forEachChild((c) => (c.kind === kind ? c : undefined));
}

export function findChildBeforeChildOfKind(node: ts.Node, kind: ts.SyntaxKind) {
  let nodeBefore: ts.Node;
  return node.forEachChild((c) => {
    if (c.kind === kind) {
      return nodeBefore;
    }
    nodeBefore = c;
  });
}

export function findChildrenOfKind(node: ts.Node, kind: ts.SyntaxKind) {
  let res: ts.Node[] = [];

  node.forEachChild((c) => {
    if (c.kind === kind) {
      res.push(c);
    }
    return undefined;
  });

  return res;
}

export function findFirstNestedChildOfKind(
  node: ts.Node,
  kind: ts.SyntaxKind,
  additionalQuery?: (oNode: ts.Node) => boolean
): ts.Node | undefined {
  // Get source file from the root node for consistent text access
  const sourceFile = node.getSourceFile();

  function searchNode(n: ts.Node): ts.Node | undefined {
    return n.forEachChild((c) => {
      if (c.kind === kind && (!additionalQuery || additionalQuery(c))) {
        return c;
      }

      if (c.getChildCount(sourceFile)) {
        return searchNode(c);
      }
      return undefined;
    });
  }

  return searchNode(node);
}

export function findFirstChildOfKindOrThrow(
  node: ts.Node,
  kind: ts.SyntaxKind
): ts.Node {
  const res = findFirstChildOfKind(node, kind);

  if (!res) {
    throw new Error(
      "Expected to find child of kind " + kind + " in " + node.getText()
    );
  }

  return res;
}

export function getFrusterRequestTypes(node: ts.ParameterDeclaration) {
  const reqTypeRef = findFirstChildOfKind(node, ts.SyntaxKind.TypeReference) as
    | ts.TypeReferenceNode
    | undefined;

  if (reqTypeRef) {
    const [reqBodyTypeNode, paramsTypeNode, queryTypeNode] =
      reqTypeRef.typeArguments || [];

    return {
      reqBodyTypeNode: !isKeyword(reqBodyTypeNode)
        ? reqBodyTypeNode
        : undefined,
      paramsTypeNode: !isKeyword(paramsTypeNode) ? paramsTypeNode : undefined,
      queryTypeNode: !isKeyword(queryTypeNode) ? queryTypeNode : undefined,
    };
  }

  return {
    reqBodyTypeNode: undefined,
    paramsTypeNode: undefined,
    queryTypeNode: undefined,
  };
}

export function getFrusterResponseType(
  node: ts.TypeReferenceNode,
  sourceFile?: ts.SourceFile
) {
  let typeNode: ts.TypeNode;
  // In TypeScript 5.9+, we need to handle cases where node might not have source file
  const sf = sourceFile || node.getSourceFile();

  if (node.getText(sf).indexOf("Promise") === 0) {
    // Response type was wrapped in promise:
    // Promise<FrusterResponse<Foo>>
    const nestedTypeRef = findFirstChildOfKind(
      node,
      ts.SyntaxKind.TypeReference
    ) as ts.TypeReferenceNode;

    typeNode = (nestedTypeRef.typeArguments || [])[0];
  } else {
    typeNode = (node.typeArguments || [])[0];
  }

  return !isKeyword(typeNode) ? typeNode : undefined;
}

function isKeyword(node?: ts.Node) {
  if (!node) {
    return false;
  }

  return [
    ts.SyntaxKind.NumberKeyword,
    ts.SyntaxKind.StringKeyword,
    ts.SyntaxKind.BooleanKeyword,
    ts.SyntaxKind.VoidKeyword,
    ts.SyntaxKind.UndefinedKeyword,
    ts.SyntaxKind.AnyKeyword,
  ].includes(node.kind);
}

/**
 * Parses a json object into object literal expression.
 * @param json
 * @returns
 */
export function parseJson(json: any) {
  return ts.parseJsonText("tmp", JSON.stringify(json)).statements[0]
    .expression as ts.ObjectLiteralExpression;
}
