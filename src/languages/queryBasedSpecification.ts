import * as fs from "fs";
import { NodeMatcherAlternative, ScopeType } from "../typings/Types";
import { createPatternMatchers } from "../util/nodeMatchers";
import { defaultMatcher } from "../util/queryNodeMatchers";
import path = require("path");
import scopeToKeyword, { ScopeTypeToKeyword } from "../util/scopeToKeyword";

function getMatchers(
  queries: string
): Partial<Record<ScopeType, NodeMatcherAlternative>> {
  const matchers: Partial<Record<ScopeType, NodeMatcherAlternative>> = {};
  for (const scopeType in scopeToKeyword as ScopeTypeToKeyword) {
    generateMatcher(queries, scopeType, matchers);
  }
  return matchers;
}

function generateMatcher(
  queries: string,
  scopeType: string,
  matchers: Partial<Record<ScopeType, NodeMatcherAlternative>>
) {
  if (queries.match(`@${scopeType}`)) {
    const searchScopePresent = !!queries.match(`@${scopeType}.searchScope`);
    matchers[scopeType as ScopeType] = defaultMatcher(
      scopeToKeyword[scopeType as ScopeType],
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
