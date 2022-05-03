import { Language, QueryCapture, SyntaxNode, Query } from "web-tree-sitter";
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
  nodeNames: string[] | string,
  scopeQuery: string,
  selector: SelectionExtractor = simpleSelectionExtractor
): NodeMatcher {
  return (selection: SelectionWithEditor, node: SyntaxNode) => {
    let pred = Array.isArray(nodeNames) ? nodeNames : [nodeNames];
    const query = getQuery(node, scopeQuery);

    let nodeToMatch = node;
    let capture: QueryCapture[] = [];

    while (nodeToMatch) {
      const captures = query.captures(nodeToMatch);
      capture = captures.filter((capture) => {
        return pred.includes(capture.name);
      });
      if (capture.length > 0) {
        break;
      }
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

// function getPredicate(query: Query, searchName: string) {
//   return query
//     .predicates
//     .filter((predicate) => predicate.length > 0)
//     .find((predicate) => {
//       name, matchesKeys = predicate.operator;
//       return name === searchName;
//     })
// };

// export function argumentMatcher(
//   scopeQuery: string,
//   selector: SelectionExtractor = simpleSelectionExtractor
// ): NodeMatcher {
//   return (selection: SelectionWithEditor, node: SyntaxNode) => {
//     const query = getQuery(node, scopeQuery);

//     return [
//       {
//         node: capture[0].node,
//         selection: selector(selection.editor, capture[0].node),
//       },
//     ];
//   };
// }
