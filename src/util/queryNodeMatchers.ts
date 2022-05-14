import { Position, Range } from "vscode";
import { SyntaxNode, Query, Language, QueryCapture } from "web-tree-sitter";
import {
  NodeMatcher,
  NodeMatcherValue,
  SelectionExtractor,
  SelectionWithEditor,
} from "../typings/Types";
import { simpleSelectionExtractor } from "./nodeSelectors";

export function defaultMatcher(
  scopeType: string,
  searchScopePresent: boolean,
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
      query = getQuery(node, scopeQuery);
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
      if (searchScopePresent) {
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
    const range: Range = new Range(
      new Position(c.node.startPosition.row, c.node.startPosition.column),
      new Position(c.node.endPosition.row, c.node.endPosition.column)
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

function getQuery(node: SyntaxNode, scopeQuery: string): Query {
  const language = node.tree.getLanguage() as Language;
  return language.query(scopeQuery);
}

function generatePointFromSelection(
  selection: SelectionWithEditor,
  pointType: "start" | "end"
) {
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
