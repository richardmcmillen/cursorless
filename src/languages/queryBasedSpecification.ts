import {
  NodeMatcherAlternative,
  scopeTypes,
  ScopeType,
} from "../typings/Types";
import { createPatternMatchers } from "../util/nodeMatchers";
import { defaultMatcher } from "../util/queryNodeMatchers";
import { join } from "path";

function getMatchers(
  queries: string
): Partial<Record<ScopeType, NodeMatcherAlternative>> {
  const matchers: Partial<Record<ScopeType, NodeMatcherAlternative>> = {};
  for (const scopeType of scopeTypes) {
    generateMatcher(queries, scopeType, matchers);
  }
  return matchers;
}

function generateMatcher(
  queries: string,
  scopeType: ScopeType,
  matchers: Partial<Record<ScopeType, NodeMatcherAlternative>>
) {
  if (queries.match(`@${scopeType}`)) {
    const isIterationScopePresent = !!queries.match(
      `@${scopeType}.iterationScope`
    );
    matchers[scopeType as ScopeType] = defaultMatcher(
      scopeType,
      isIterationScopePresent,
      queries
    );
  }
}

export default function (languageName: string) {
  const queryPath = join(
    "..",
    // TODO: look at instantiating this as a class and using graph
    // this.graph.extensionContext.extensionPath,
    "queries",
    languageName,
    "scopeTypes.scm"
  );

  return createPatternMatchers(getMatchers(queryPath));
}
