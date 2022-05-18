import { Range } from "vscode";
import { SyntaxNode, Query, Language, QueryCapture } from "web-tree-sitter";
import Parser = require("web-tree-sitter");
import {
  NodeMatcher,
  NodeMatcherValue,
  SelectionExtractor,
  SelectionWithEditor,
} from "../typings/Types";
import {
  makeRangeFromPositions,
  simpleSelectionExtractor,
} from "./nodeSelectors";

export function defaultMatcher(
  scopeType: string,
  isIterationScopePresent: boolean,
  scopeQuery: string,
  selector: SelectionExtractor = simpleSelectionExtractor
): NodeMatcher {
  let query: Query;

  return (
    selection: SelectionWithEditor,
    node: SyntaxNode,
    siblings: boolean | undefined
  ): NodeMatcherValue[] | null => {
    if (!query) {
      query = getQuery(node.tree.getLanguage(), scopeQuery);
    }

    const captures = extractCaptures(
      selection,
      node.tree.rootNode,
      query,
      scopeType
    );

    if (captures.length === 0) {
      return null;
    }
    let capture: QueryCapture;
    capture = selectCaptureByRange(captures, selection);
    if (siblings) {
      let captures: QueryCapture[];
      if (isIterationScopePresent) {
        throw new Error("searchScope based queries are not implemented.");
      } else {
        captures = findBySiblingsByParent(
          capture.node,
          selection,
          query,
          scopeType
        );
      }

      return captures!.map((c) => {
        return {
          node: c.node,
          selection: selector(selection.editor, c.node),
        };
      });
    } else {
      return [
        {
          node: capture!.node,
          selection: selector(selection.editor, capture!.node),
        },
      ];
    }
  };
}

function extractCaptures(
  selection: SelectionWithEditor,
  root: SyntaxNode,
  query: Query,
  scopeType: string
) {
  const startPoint = generatePointFromSelection(selection, "start");
  const endPoint = generatePointFromSelection(selection, "end");

  return query.captures(root, startPoint, endPoint).filter((capture) => {
    return capture.name === scopeType;
  });
}

function selectCaptureByRange(
  captures: QueryCapture[],
  selection: SelectionWithEditor
) {
  let capture: QueryCapture;
  captures.forEach((c) => {
    const range: Range = makeRangeFromPositions(
      c.node.startPosition,
      c.node.endPosition
    );

    const hasIntersection = selection.selection.intersection(range);
    if (!capture) {
      capture = c;
    } else {
      if (
        hasIntersection &&
        c.node.endIndex - c.node.startIndex <
          capture.node.endIndex - capture.node.startIndex
      ) {
        capture = c;
      }
    }
  });
  return capture!;
}

function getQuery(language: Language, scopeQuery: string): Query {
  return language.query(scopeQuery);
}

function generatePointFromSelection(
  selection: SelectionWithEditor,
  pointType: "start" | "end"
): Parser.Point {
  return {
    row: selection.selection[pointType].line,
    column: selection.selection[pointType].character,
  };
}

function findBySiblingsByParent(
  node: SyntaxNode,
  selection: SelectionWithEditor,
  query: Query,
  scopeType: string
) {
  let parent: SyntaxNode | null = node.parent;
  const ids = parent?.namedChildren.map((c) => c.id);
  while (parent != null) {
    const matches = query
      .captures(parent)
      .filter(
        (capture) =>
          capture.name === scopeType && ids?.includes(capture.node.id)
      );
    if (matches.length > 0) {
      return matches;
    }
    parent = parent.parent;
  }
  return [];
}
