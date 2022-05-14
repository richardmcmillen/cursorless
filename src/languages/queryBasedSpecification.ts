import * as fs from "fs";
import { NodeMatcherAlternative, scopes, ScopeType } from "../typings/Types";
import { createPatternMatchers } from "../util/nodeMatchers";
import { defaultMatcher } from "../util/queryNodeMatchers";
import path = require("path");

function getMatchers(
  queries: string
): Partial<Record<ScopeType, NodeMatcherAlternative>> {
  const matchers: Partial<Record<ScopeType, NodeMatcherAlternative>> = {};
  for (const scopeType of scopes) {
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
    const searchScopePresent = !!queries.match(`@${scopeType}.searchScope`);
    matchers[scopeType as ScopeType] = defaultMatcher(
      scopeType,
      searchScopePresent,
      queries
    );
  }
}

export default function (languageName: string) {
  const queries = fs.readFileSync(
    path.join(__dirname, `../queries/${languageName}/scopeTypes.scm`),
    "utf-8"
  );

  return createPatternMatchers(getMatchers(queries));
}
