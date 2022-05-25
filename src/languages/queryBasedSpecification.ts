import {
  NodeMatcherAlternative,
  scopeTypes,
  ScopeType,
} from "../typings/Types";
import { createPatternMatchers } from "../util/nodeMatchers";
import { defaultMatcher } from "../util/queryNodeMatchers";
import * as fs from "fs";
import * as path from "path";
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
  if (queries.match(`@${scopeType}[^a-zA-Z]`)) {
    const isIterationScopePresent = !!queries.match(
      `@${scopeType}.iterationScope[^a-zA-Z]`
    );
    matchers[scopeType as ScopeType] = defaultMatcher(
      scopeType,
      isIterationScopePresent,
      queries
    );
  }
}

export default function (languageName: string) {
  const queryPath = fs.readFileSync(
    path.join(__dirname, `../queries/${languageName}/scopeTypes.scm`),
    "utf-8"
  );

  return createPatternMatchers(getMatchers(queryPath));
}
