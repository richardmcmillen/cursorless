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
    if (scopeType === "argumentOrParameter") {
      continue;
    }
    if (queries.match(`@${scopeType}`)) {
      matchers[scopeType as ScopeType] = defaultMatcher(
        scopeToKeyword[scopeType as ScopeType],
        queries
      );
    }
  }

  // matchers["argumentOrParameter"] = argumentMatcher(queries);

  return matchers;
}

/* 
  TODO: Definitely cache this load, perhaps we can compare against a 
  hash of the contents to know if we need to reload. This would be great DX for
  people adding new scopeTypes. No need to recompile(I don't think?), just edit the scm
  file. 
*/
export default function (languageName: string) {
  const queries = fs.readFileSync(
    path.join(__dirname, `../queries/${languageName}/scopeTypes.scm`),
    "utf-8"
  );

  return createPatternMatchers(getMatchers(queries));
}
