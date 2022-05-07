import { Range } from "vscode";
import { Language, SyntaxNode, Query } from "web-tree-sitter";
import {
  NodeMatcher,
  SelectionExtractor,
  SelectionWithEditor,
} from "../typings/Types";
import { simpleSelectionExtractor } from "./nodeSelectors";

function getQuery(node: SyntaxNode, scopeQuery: string): Query {
  const language = node.tree.getLanguage() as Language;
  return language.query(scopeQuery);
}

export function defaultMatcher(
  scopeType: string,
  scopeQuery: string,
  selector: SelectionExtractor = simpleSelectionExtractor
): NodeMatcher {
  return (selection: SelectionWithEditor, node: SyntaxNode) => {
    const startPoint = generatePointFromSelection(selection, "start");
    const endPoint = generatePointFromSelection(selection, "end");
    const query = getQuery(node, scopeQuery);
    let captures = query
      .captures(node.tree.rootNode, startPoint, endPoint)
      .filter((capture) => {
        return capture.name === scopeType;
      });

    if (captures.length === 0) {
      return null;
    }
    return [
      {
        node: captures[captures.length - 1].node,
        selection: selector(
          selection.editor,
          captures[captures.length - 1].node
        ),
      },
    ];
  };
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
