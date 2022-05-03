import * as fs from "fs";
import {
  NodeMatcherAlternative,
  ScopeType,
} from "../typings/Types";
import { createPatternMatchers } from "../util/nodeMatchers";
import { defaultMatcher } from "../util/queryNodeMatchers";
import path = require("path");
import scopeToKeyword, { ScopeTypeToKeyword } from "../util/scopeToKeyword";

function getMatchers(queries: string): Partial<Record<ScopeType, NodeMatcherAlternative>> {
  const matchers: Partial<Record<ScopeType, NodeMatcherAlternative>> = {};

  for (const scopeType in scopeToKeyword as ScopeTypeToKeyword) {

    if (scopeType === "argumentOrParameter") {
      continue;
    }

    matchers[scopeType as ScopeType] = defaultMatcher(
      scopeToKeyword[scopeType as ScopeType],
      queries
    );
  }

  // matchers["argumentOrParameter"] = argumentMatcher(queries);

  return matchers;
}

export default function (languageName: string) {
  console.log(__dirname);
  console.log(path.dirname(__filename));
  const queries = fs.readFileSync(
    path.join(__dirname, `../queries/${languageName}/scopeTypes.scm`),
    "utf-8"
  );

  return createPatternMatchers(getMatchers(queries));
}
