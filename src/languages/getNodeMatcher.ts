import { SyntaxNode } from "web-tree-sitter";
import { notSupported } from "../util/nodeMatchers";
import { selectionWithEditorFromRange } from "../util/selectionUtils";
import {
  NodeMatcher,
  NodeMatcherValue,
  ScopeType,
  SelectionWithEditor,
} from "../typings/Types";
import cpp from "./cpp";
import clojure from "./clojure";
import csharp from "./csharp";
import { patternMatchers as json } from "./json";
import { patternMatchers as typescript } from "./typescript";
import java from "./java";
import { patternMatchers as html } from "./html";
import php from "./php";
import python from "./python";
import markdown from "./markdown";
import { patternMatchers as ruby } from "./ruby";
import scala from "./scala";
import { patternMatchers as scss } from "./scss";
import go from "./go";
import { UnsupportedLanguageError } from "../errors";
import { SupportedLanguageId } from "./constants";
import queryBasedSpecification from "./queryBasedSpecification";
import { intersection } from "lodash";

export function getNodeMatcher(
  languageId: string,
  scopeType: ScopeType,
  includeSiblings: boolean
): NodeMatcher {
  const matchers = languageMatchers[languageId as SupportedLanguageId];

  if (matchers == null) {
    throw new UnsupportedLanguageError(languageId);
  }

  const matcher = matchers[scopeType];

  if (matcher == null) {
    return notSupported;
  }

  if (includeSiblings) {
    return matcherIncludeSiblings(matcher);
  }

  return matcher;
}

const languageMatchers: Record<
  SupportedLanguageId,
  Record<ScopeType, NodeMatcher>
> = {
  c: cpp,
  cpp,
  css: scss,
  csharp,
  clojure,
  go,
  html,
  java,
  javascript: typescript,
  javascriptreact: typescript,
  json,
  jsonc: json,
  markdown,
  php,
  python,
  ruby: mergeMatchers(ruby, "ruby"),
  scala,
  scss,
  typescript,
  typescriptreact: typescript,
  xml: html,
};

function mergeMatchers(
  regexMatcher: Record<ScopeType, NodeMatcher>,
  languageName: string
): Record<ScopeType, NodeMatcher> {
  const queryBasedMatchers: Record<ScopeType, NodeMatcher> =
    queryBasedSpecification(languageName);
  const possibleDuplicateDefinitions = intersection(
    Object.keys(regexMatcher),
    Object.keys(queryBasedMatchers)
  );
  if (possibleDuplicateDefinitions.length > 0) {
    throw new Error(
      `ScopeTypes: [${possibleDuplicateDefinitions.join(
        ", "
      )}] for ${languageName} defined via both Regex and Query code paths. Please remove duplicates`
    );
  }
  return Object.assign(regexMatcher, queryBasedMatchers);
}

function matcherIncludeSiblings(matcher: NodeMatcher): NodeMatcher {
  return (
    selection: SelectionWithEditor,
    node: SyntaxNode
  ): NodeMatcherValue[] | null => {
    let matches = matcher(selection, node);
    if (matches == null) {
      return null;
    }
    matches = matches.flatMap((match) =>
      iterateNearestIterableAncestor(
        match.node,
        selectionWithEditorFromRange(selection, match.selection.selection),
        matcher
      )
    ) as NodeMatcherValue[];
    if (matches.length > 0) {
      return matches;
    }
    return null;
  };
}

function iterateNearestIterableAncestor(
  node: SyntaxNode,
  selection: SelectionWithEditor,
  nodeMatcher: NodeMatcher
) {
  let parent: SyntaxNode | null = node.parent;
  while (parent != null) {
    const matches = parent!.namedChildren
      .flatMap((sibling) => nodeMatcher(selection, sibling))
      .filter((match) => match != null) as NodeMatcherValue[];
    if (matches.length > 0) {
      return matches;
    }
    parent = parent.parent;
  }
  return [];
}
