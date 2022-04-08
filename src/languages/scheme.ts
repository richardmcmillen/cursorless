import { SyntaxNode } from "web-tree-sitter";
import { ScopeType, NodeMatcherAlternative, SelectionWithEditor } from "../typings/Types";
import { createPatternMatchers } from "../util/nodeMatchers";
import { defaultMatcher } from "../util/queryNodeMatchers";

const nodeMatchers: Partial<Record<ScopeType, NodeMatcherAlternative>> = {
  comment: defaultMatcher(["comment"], "(comment) @comment"),
  list: defaultMatcher(["list"], "(list) @list")
};

export const patternMatchers = createPatternMatchers(nodeMatchers);

export function stringTextFragmentExtractor(
  node: SyntaxNode,
  _selection: SelectionWithEditor
) {

  return null;
}