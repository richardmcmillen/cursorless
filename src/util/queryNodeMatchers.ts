import { Language, QueryCapture, SyntaxNode } from "web-tree-sitter";
import { NodeMatcher, ScopeType, SelectionExtractor, SelectionWithEditor } from "../typings/Types";
import { simpleSelectionExtractor } from "./nodeSelectors";

export function defaultMatcher(
  nodeNames: string[] | string,
  scopeQuery: string,
  selector: SelectionExtractor = simpleSelectionExtractor
): NodeMatcher {
  return (selection: SelectionWithEditor, node: SyntaxNode) => {
    let pred = Array.isArray(nodeNames) ? nodeNames : [nodeNames];

    const language = node.tree.getLanguage() as Language;
    const query = language.query(scopeQuery);
    let nodeToMatch = node;
    let capture: QueryCapture[] = [];
    while (nodeToMatch) {
      const captures = query.captures(nodeToMatch);
      capture = captures.filter((capture) => {
        return pred.includes(capture.name);
      });
      if (capture.length > 0) { break; };
      nodeToMatch = nodeToMatch.parent!;
    }
    if (capture.length === 0) {
      return null;
    }
    return [
      {
        node: capture[0].node,
        selection: selector(selection.editor, capture[0].node),
      },
    ];
  };
}