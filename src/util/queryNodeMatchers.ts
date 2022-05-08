import { Position, Range } from "vscode";
import { SyntaxNode, Query, Language, QueryCapture } from "web-tree-sitter";
import {
  NodeMatcher,
  SelectionExtractor,
  SelectionWithEditor,
} from "../typings/Types";
import { simpleSelectionExtractor } from "./nodeSelectors";

export function defaultMatcher(
  scopeType: string,
  scopeQuery: string,
  selector: SelectionExtractor = simpleSelectionExtractor
): NodeMatcher {
  let query: Query;

  return (selection: SelectionWithEditor, node: SyntaxNode) => {
    const startPoint = generatePointFromSelection(selection, "start");
    const endPoint = generatePointFromSelection(selection, "end");
    if (!query) {
      query = getQuery(node, scopeQuery);
    }
    let captures = query
      .captures(node.tree.rootNode, startPoint, endPoint)
      .filter((capture) => {
        return capture.name === scopeType;
      });

    if (captures.length === 0) {
      return null;
    }

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

    return [
      {
        node: capture!.node,
        selection: selector(selection.editor, capture!.node),
      },
    ];
  };
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
